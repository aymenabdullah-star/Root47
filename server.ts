import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateCampuses, haversineDistance } from './src/data/campuses.js';
import { fetchCampusesFromSheet } from './src/sheetSync.js';
import { fetchWeatherWalay } from './src/weatherwalay.js';
import { Campus, SafetyAlert, IncidentReport, WeatherTelemetry } from './src/types.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, getDocFromServer } from 'firebase/firestore';
import fs from 'fs';

dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local', override: true }); // .env.local takes priority

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// Load configurations and initialize Firebase
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(firebaseConfigPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
} else {
  console.warn('Firebase config file matching firebase-applet-config.json not found!');
}

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Test connection on startup as mandated
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Firebase connection test successfully executed!');
  } catch (error: any) {
    if (error && error.message && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: DB client appears offline.");
    } else {
      console.log('Firebase connection test executed. Initial schema active.');
    }
  }
}
testFirestoreConnection();

// Strip undefined values recursively — Firestore rejects undefined fields
function stripUndefined<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, (_, v) => v === undefined ? null : v));
}

// Direct database helpers to sync changes to Firestore
async function saveCampusToFirestore(campus: Campus) {
  try {
    await setDoc(doc(db, 'campuses', campus.branchId), stripUndefined(campus));
  } catch (err) {
    console.error(`Failed to save campus ${campus.branchId} to Firestore:`, err);
  }
}

async function saveSafetyAlertToFirestore(alert: SafetyAlert) {
  try {
    await setDoc(doc(db, 'safetyAlerts', alert.id), stripUndefined(alert));
  } catch (err) {
    console.error(`Failed to save safety alert ${alert.id} to Firestore:`, err);
  }
}

async function saveIncidentReportToFirestore(report: IncidentReport) {
  try {
    await setDoc(doc(db, 'incidentReports', report.id), stripUndefined(report));
  } catch (err) {
    console.error(`Failed to save incident report ${report.id} to Firestore:`, err);
  }
}

async function saveUserStateToFirestore(userId: string, state: { points: number; badges: string[]; clicksCount: number }) {
  try {
    await setDoc(doc(db, 'usersState', userId), state);
  } catch (err) {
    console.error(`Failed to save user state ${userId} to Firestore:`, err);
  }
}

async function saveDisasterPresetToFirestore(id: string, active: boolean) {
  try {
    await setDoc(doc(db, 'disasterPresetsActive', id), { id, active });
  } catch (err) {
    console.error(`Failed to save disaster preset ${id} to Firestore:`, err);
  }
}

// In-memory single-source-of-truth stores synchronized with Firestore
let campuses: Campus[] = [];
let incidentReports: IncidentReport[] = [];
let safetyAlerts: SafetyAlert[] = [];
let disasterPresetsActive: Record<string, boolean> = {
  'hazard-smog-lahore': false,
  'hazard-flood-islamabad': false,
  'hazard-heat-karachi': false,
};

const userStateAdditions: Record<string, { points: number; badges: string[]; clicksCount: number }> = {};

// Asynchronous seeding and loading synchronization function matching Schema path designs
async function syncDatabaseFromFirestore() {
  try {
    console.log('[FireSync] Fetching database contents from Firestore...');

    // 1. Campuses
    const campusesSnap = await getDocs(collection(db, 'campuses'));
    // Detect old fake generated data. Real sheet campuses have IDs like BSS-750/BSS-282
    // and real names from the "Campus / Branch" sheet column. Old generated data is
    // BSS-001..BSS-210 and often falls back to names like "Kohat - Campus 1".
    const hasRealData = campusesSnap.docs.some(d => {
      const numPart = parseInt(d.id.replace('BSS-', ''), 10);
      return numPart >= 250; // Real sheet IDs are 207+, but we check 250 to be safe
    });
    const hasGeneratedPlaceholderNames = campusesSnap.docs.some(d => {
      const data = d.data() as Partial<Campus>;
      return typeof data.name === 'string' && /\s-\sCampus\s+\d+$/i.test(data.name);
    });
    const needsSheetSeed = campusesSnap.empty || !hasRealData || hasGeneratedPlaceholderNames;
    if (needsSheetSeed) {
      if (!campusesSnap.empty) {
        console.log(`[FireSync] Detected ${campusesSnap.size} old/generated campuses. Migrating to real sheet data...`);
      } else {
        console.log('[FireSync] Firestore campuses collection is empty. Fetching from Google Sheet...');
      }
      let initialCampuses: Campus[];
      try {
        initialCampuses = await fetchCampusesFromSheet();
      } catch (sheetErr) {
        console.warn('[FireSync] Sheet fetch failed, falling back to generated campuses:', sheetErr);
        initialCampuses = generateCampuses();
      }
      for (const campus of initialCampuses) {
        await saveCampusToFirestore(campus);
      }
      campuses = initialCampuses;
    } else {
      campuses = [];
      campusesSnap.forEach(docSnap => {
        campuses.push(docSnap.data() as Campus);
      });
      console.log(`[FireSync] Loaded ${campuses.length} campuses from Firestore.`);
    }

    // 2. Disaster Presets
    const presetsSnap = await getDocs(collection(db, 'disasterPresetsActive'));
    if (presetsSnap.empty) {
      for (const presetId of Object.keys(disasterPresetsActive)) {
        await saveDisasterPresetToFirestore(presetId, disasterPresetsActive[presetId]);
      }
    } else {
      presetsSnap.forEach(docSnap => {
        const data = docSnap.data() as { id: string; active: boolean };
        if (data && data.id) {
          disasterPresetsActive[data.id] = data.active;
        }
      });
      console.log('[FireSync] Loaded active disaster presets state.');
    }

    // 3. Safety Alerts
    const alertsSnap = await getDocs(collection(db, 'safetyAlerts'));
    safetyAlerts = [];
    alertsSnap.forEach(docSnap => {
      safetyAlerts.push(docSnap.data() as SafetyAlert);
    });
    console.log(`[FireSync] Loaded ${safetyAlerts.length} safety alerts.`);

    // 4. Incident Reports
    const incidentsSnap = await getDocs(collection(db, 'incidentReports'));
    incidentReports = [];
    incidentsSnap.forEach(docSnap => {
      incidentReports.push(docSnap.data() as IncidentReport);
    });
    console.log(`[FireSync] Loaded ${incidentReports.length} incident reports.`);

    // 5. User States
    const userStatesSnap = await getDocs(collection(db, 'usersState'));
    userStatesSnap.forEach(docSnap => {
      userStateAdditions[docSnap.id] = docSnap.data() as { points: number; badges: string[]; clicksCount: number };
    });
    console.log(`[FireSync] Loaded gamification states for ${Object.keys(userStateAdditions).length} users.`);

    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();
    console.log('[FireSync] Database successfully synchronized and calibrated.');

  } catch (error) {
    console.error('[FireSync] Error during database synchronization:', error);
    try {
      campuses = generateCampuses();
      recalculateOperationalStatuses();
      syncSafetyAlertReviewQueue();
    } catch (fallbackErr) {
      console.error('[FireSync] Fallback generation failed:', fallbackErr);
    }
  }
}

// Perform Firestore initialization sync
syncDatabaseFromFirestore();

// Helper to evaluate weather status based on limits
// Category A (Severe Weather): Temp > 43°C OR Visibility < 1km (dense fog/smog) OR (Rain > 85% AND Humidity > 85%) OR (UV > 11 AND Temp > 40°C)
// Category B (Caution): Temp > 39°C OR Visibility < 3km (haze) OR Chance of Rain > 70%
// Safe Weather: Operational
function evaluateOperationalStatus(weather: WeatherTelemetry): 'Operational' | 'Caution' | 'Severe Disruption' {
  if (
    weather.temp > 43 ||
    weather.visibility < 1 ||
    (weather.chanceOfRain > 85 && weather.humidity > 85) ||
    (weather.uvIndex > 11 && weather.temp > 40)
  ) {
    return 'Severe Disruption';
  } else if (
    weather.temp > 39 ||
    weather.visibility < 3 ||
    weather.chanceOfRain > 70
  ) {
    return 'Caution';
  }
  return 'Operational';
}

// Geofencing recalculation helper
function recalculateOperationalStatuses() {
  const activeDisasters = [
    { id: 'hazard-smog-lahore', lat: 31.5204, lng: 74.3587, type: 'Smog' },
    { id: 'hazard-flood-islamabad', lat: 33.7150, lng: 73.0120, type: 'Flash Flood' },
    { id: 'hazard-heat-karachi', lat: 24.8450, lng: 67.0200, type: 'Heatwave' }
  ].filter(d => disasterPresetsActive[d.id]);

  campuses.forEach(campus => {
    // If it has a manual override, we preserve it unless it's cleared
    if (campus.manualOverride) {
      return;
    }

    // Check geofence within 12 KM of active disaster preset centers
    let disasterImpacted = false;
    let matchingDisasterType = '';

    for (const d of activeDisasters) {
      const distance = haversineDistance(campus.latitude, campus.longitude, d.lat, d.lng);
      if (distance <= 12) {
        disasterImpacted = true;
        matchingDisasterType = d.type;
        break;
      }
    }

    if (disasterImpacted) {
      campus.hazardEffectId = matchingDisasterType;
      campus.operationalStatus = 'Severe Disruption';
      // Adjust weather metrics to represent severity
      if (matchingDisasterType === 'Smog') {
        campus.weather.visibility = 0.3;  // near-zero visibility = dense smog
        campus.weather.cloudCover = 95;
        campus.weather.weatherCondition = 'Haze';
      } else if (matchingDisasterType === 'Flash Flood') {
        campus.weather.chanceOfRain = 95;
        campus.weather.humidity = 90;
        campus.weather.visibility = 1;
        campus.weather.weatherCondition = 'Heavy Rain';
      } else if (matchingDisasterType === 'Heatwave') {
        campus.weather.temp = 46;
        campus.weather.uvIndex = 12;
        campus.weather.feelsLike = 51;
        campus.weather.weatherCondition = 'Hot';
      }
    } else {
      campus.hazardEffectId = undefined;
      // Normal meteorological rule evaluation
      campus.operationalStatus = evaluateOperationalStatus(campus.weather);
    }
  });
}

// Check alert generation on status changes
function syncSafetyAlertReviewQueue() {
  campuses.forEach(campus => {
    if (campus.operationalStatus === 'Severe Disruption') {
      // Auto-trigger Category A dispatch if not already exists in reviews
      const existing = safetyAlerts.find(a => a.campusId === campus.branchId && a.severity === 'A' && a.status !== 'Dismissed');
      if (!existing) {
        const titleText = `🔴 SEVERE WEATHER WARNING: ${campus.name}`;
        const briefText = `Immediate severe weather disruption at BSS ${campus.name} (City: ${campus.city}, Region: ${campus.region}). Condition: ${campus.weather.weatherCondition}. Metrics: Temp ${campus.weather.temp}°C, Feels Like ${campus.weather.feelsLike}°C, Visibility ${campus.weather.visibility}km. All students and staff advised extreme caution.`;
        
        const newAlert: SafetyAlert = {
          id: `alert-auto-${Date.now()}-${campus.branchId}`,
          campusId: campus.branchId,
          campusName: campus.name,
          region: campus.region,
          status: 'Broadcasted', // Instantly triggers Category A dispatches & broadcast
          severity: 'A',
          title: titleText,
          message: briefText,
          channels: { sms: true, whatsapp: true, email: true },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        safetyAlerts.push(newAlert);
        saveSafetyAlertToFirestore(newAlert);
      }
    } else if (campus.operationalStatus === 'Caution') {
      // Category B holds in Pending Review Queue
      const existing = safetyAlerts.find(a => a.campusId === campus.branchId && a.status === 'Pending Review');
      if (!existing) {
        const newAlert: SafetyAlert = {
          id: `alert-pending-${Date.now()}-${campus.branchId}`,
          campusId: campus.branchId,
          campusName: campus.name,
          region: campus.region,
          status: 'Pending Review',
          severity: 'B',
          title: `⚠️ CAUTION REQUIRED: ${campus.name}`,
          message: `Caution advised at ${campus.name}. Condition: ${campus.weather.weatherCondition}. Temp: ${campus.weather.temp}°C, Visibility: ${campus.weather.visibility}km, Rain: ${campus.weather.chanceOfRain}%. Retaining in review queue.`,
          channels: { sms: true, whatsapp: true, email: false },
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        safetyAlerts.push(newAlert);
        saveSafetyAlertToFirestore(newAlert);
      }
    }
  });
}

// Perform initial check
recalculateOperationalStatuses();
syncSafetyAlertReviewQueue();

// API Endpoints

// 0. Force re-sync campuses from Google Sheet
app.post('/api/campuses/sync-sheet', async (req, res) => {
  try {
    console.log('[SheetSync] Manual re-sync triggered via API...');
    const freshCampuses = await fetchCampusesFromSheet();
    // Merge weather from existing in-memory campuses to preserve live telemetry
    campuses = freshCampuses.map(fresh => {
      const existing = campuses.find(c => c.branchId === fresh.branchId);
      return existing ? { ...fresh, weather: existing.weather, operationalStatus: existing.operationalStatus } : fresh;
    });
    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();
    // Persist all to Firestore
    await Promise.all(campuses.map(c => saveCampusToFirestore(c)));
    res.json({ success: true, count: campuses.length, message: `Synced ${campuses.length} campuses from Google Sheet.` });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. Get Campuses and states
app.get('/api/campuses', (req, res) => {
  res.json({
    campuses,
    disasterPresetsActive,
    safetyAlerts,
    incidentReports
  });
});

// 2. Clear manual overrides & Fetch Live Weather via WeatherWalay API
app.post('/api/weather/fetch', async (req, res) => {
  try {
    const hasWeatherCreds = !!process.env.WEATHERWALAY_USERNAME && !!process.env.WEATHERWALAY_SECRET;

    if (hasWeatherCreds) {
      console.log('[WeatherWalay] Starting live weather sync for all campuses...');

      // Deduplicate by city to avoid hitting rate limit (429) — one call per unique city
      const cityCoordMap: Record<string, { lat: number; lng: number }> = {};
      campuses.forEach(c => {
        if (!cityCoordMap[c.city]) {
          cityCoordMap[c.city] = { lat: c.latitude, lng: c.longitude };
        }
      });

      // Fetch weather per unique city with a small delay to respect rate limits
      const cityWeatherMap: Record<string, Partial<WeatherTelemetry>> = {};
      let fetchedCount = 0;
      let failedCities: string[] = [];

      for (const [city, coords] of Object.entries(cityCoordMap)) {
        try {
          const weather = await fetchWeatherWalay(coords.lat, coords.lng);
          cityWeatherMap[city] = weather;
          fetchedCount++;
          // Small delay between requests to respect per-second rate limit
          await new Promise(r => setTimeout(r, 300));
        } catch (err: any) {
          console.warn(`[WeatherWalay] Failed for ${city}: ${err.message}`);
          failedCities.push(city);
        }
      }

      console.log(`[WeatherWalay] Fetched weather for ${fetchedCount} cities. Failed: ${failedCities.length}`);

      // Apply fetched weather to all campuses, preserve AQI (not provided by WeatherWalay)
      campuses.forEach(campus => {
        campus.manualOverride = false;
        campus.overrideReason = undefined;
        const liveWeather = cityWeatherMap[campus.city];
        if (liveWeather) {
          campus.weather = {
            temp: liveWeather.temp ?? campus.weather.temp,
            humidity: liveWeather.humidity ?? campus.weather.humidity,
            chanceOfRain: liveWeather.chanceOfRain ?? campus.weather.chanceOfRain,
            windSpeed: liveWeather.windSpeed ?? campus.weather.windSpeed,
            uvIndex: liveWeather.uvIndex ?? campus.weather.uvIndex,
            cloudCover: liveWeather.cloudCover ?? campus.weather.cloudCover,
            feelsLike: liveWeather.feelsLike ?? campus.weather.feelsLike,
            visibility: liveWeather.visibility ?? campus.weather.visibility,
            weatherCondition: liveWeather.weatherCondition ?? campus.weather.weatherCondition,
          };
        }
      });

    } else {
      // Fallback: simulate slight fluctuations when no API credentials configured
      console.warn('[WeatherWalay] Credentials not set — using simulated weather fluctuations.');
      campuses.forEach(campus => {
        campus.manualOverride = false;
        campus.overrideReason = undefined;
        const f = Math.random();
        campus.weather.temp = Math.max(15, Math.min(50, campus.weather.temp + Math.round((f - 0.5) * 4)));
        campus.weather.humidity = Math.max(10, Math.min(100, campus.weather.humidity + Math.round((f - 0.5) * 10)));
        campus.weather.chanceOfRain = Math.max(0, Math.min(100, campus.weather.chanceOfRain + Math.round((f - 0.5) * 15)));
        campus.weather.visibility = Math.max(0.5, Math.min(20, campus.weather.visibility + Math.round((f - 0.5) * 2)));
      });
    }

    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();

    // Persist all updated campuses to Firestore
    await Promise.all(campuses.map(c => saveCampusToFirestore(c)));

    res.json({
      success: true,
      message: hasWeatherCreds
        ? 'Successfully synchronized live weather via WeatherWalay V2 API. All manual overrides cleared.'
        : 'Simulated weather fluctuations applied (WeatherWalay credentials not configured).',
      campuses,
      safetyAlerts
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. Disaster presets toggle active/inactive
app.post('/api/disaster/toggle', async (req, res) => {
  const { id, active } = req.body;
  if (id in disasterPresetsActive) {
    disasterPresetsActive[id] = active;
    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();

    // Persist active state changes and campus updates to Firestore
    await saveDisasterPresetToFirestore(id, active);
    const savePromises = campuses.map(c => saveCampusToFirestore(c));
    await Promise.all(savePromises);

    res.json({ success: true, disasterPresetsActive, campuses, safetyAlerts });
  } else {
    res.status(404).json({ success: false, message: 'Disaster preset not found' });
  }
});

// 4. Manual Overrides (Super Admins/Regional Admins scoped)
app.post('/api/campuses/override', (req, res) => {
  const { branchId, weatherUpdate, overrideReason, userRegion, userRole } = req.body;
  
  const campusIndex = campuses.findIndex(c => c.branchId === branchId);
  if (campusIndex === -1) {
    return res.status(404).json({ success: false, message: 'Campus not found' });
  }

  const campus = campuses[campusIndex];

  // Role verification
  if (userRole !== 'super_admin') {
    if (userRole === 'regional_admin') {
      if (campus.region !== userRegion) {
        return res.status(403).json({ 
          success: false, 
          message: `Access denied. Your regional authority represents BCR/BSR/BNR of region ${userRegion}. This campus belongs to ${campus.region}.` 
        });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Insufficient privileges. Admin access required.' });
    }
  }

  // Apply override
  campus.weather = { ...campus.weather, ...weatherUpdate };
  campus.manualOverride = true;
  campus.overrideReason = overrideReason || 'Manual Administrator Intervention';
  campus.operationalStatus = evaluateOperationalStatus(campus.weather);

  recalculateOperationalStatuses();
  syncSafetyAlertReviewQueue();

  res.json({ success: true, campus, campuses, safetyAlerts });
});

// 5. Submit Crowd-Sourced Field Incident Report
app.post('/api/incidents/submit', (req, res) => {
  const { campusId, reporterName, reporterEmail, hazardType, description, weatherData } = req.body;

  const campus = campuses.find(c => c.branchId === campusId);
  if (!campus) {
    return res.status(404).json({ success: false, message: 'Campus not found' });
  }

  // Make sure it is a legitimate bh.edu.pk or professional domain email context
  const emailRegex = /@bh\.edu\.pk$/;
  if (!emailRegex.test(reporterEmail)) {
    return res.status(400).json({ success: false, message: 'Must utilize a valid BSS organizational (@bh.edu.pk) address to publish reports.' });
  }

  const newReport: IncidentReport = {
    id: `incident-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    campusId,
    campusName: campus.name,
    reporterName,
    reporterEmail,
    hazardType,
    description,
    status: 'Pending',
    reportedWeather: weatherData || {},
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  };

  incidentReports.push(newReport);
  res.json({ success: true, report: newReport, incidentReports });
});

// 6. Moderate Crowd-Sourced Field Incident Reports
app.post('/api/incidents/moderate', (req, res) => {
  const { reportId, status, userRole, userRegion } = req.body;

  const reportIdx = incidentReports.findIndex(r => r.id === reportId);
  if (reportIdx === -1) {
    return res.status(404).json({ success: false, message: 'Report not found' });
  }

  const report = incidentReports[reportIdx];
  const campus = campuses.find(c => c.branchId === report.campusId);

  // Role validation
  if (userRole !== 'super_admin') {
    if (userRole === 'regional_admin') {
      if (campus && campus.region !== userRegion) {
        return res.status(403).json({ success: false, message: `Access scoped to region ${userRegion}. Cannot moderate report on ${campus.region} campus.` });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Only administrators have moderation credentials.' });
    }
  }

  report.status = status; // 'Approved' | 'Dismissed'

  let pointsAwarded = 0;
  let unlockedBadge = '';

  if (status === 'Approved' && campus) {
    // Approve:grant the employee +100 points, unlock the "Weather Hero" badge, and instantly updates weather
    pointsAwarded = 100;
    unlockedBadge = 'Weather Hero';

    // Update target campus metrics
    campus.weather.temp = report.reportedWeather.temp ?? campus.weather.temp;
    campus.weather.visibility = (report.reportedWeather as any).visibility ?? campus.weather.visibility;
    campus.weather.chanceOfRain = report.reportedWeather.chanceOfRain ?? campus.weather.chanceOfRain;
    
    campus.manualOverride = true;
    campus.overrideReason = `Approved Crowdsourced Observer Report: ${report.hazardType} (${report.description})`;
    campus.operationalStatus = evaluateOperationalStatus(campus.weather);

    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();
  }

  res.json({ 
    success: true, 
    report, 
    incidentReports, 
    campuses, 
    safetyAlerts,
    gamificationPayload: {
      email: report.reporterEmail,
      points: pointsAwarded,
      unlockedBadge
    }
  });
});

// 7. Acknowledge warning click +20 points (5 clicks unlocks Awareness Ranger)
app.post('/api/gamification/acknowledge', (req, res) => {
  const { userId } = req.body;
  if (!userStateAdditions[userId]) {
    userStateAdditions[userId] = { points: 0, badges: [], clicksCount: 0 };
  }

  userStateAdditions[userId].clicksCount += 1;
  userStateAdditions[userId].points += 20;

  let unlockedBadge = '';
  if (userStateAdditions[userId].clicksCount === 5) {
    if (!userStateAdditions[userId].badges.includes('Awareness Ranger')) {
      userStateAdditions[userId].badges.push('Awareness Ranger');
      unlockedBadge = 'Awareness Ranger';
    }
  }

  res.json({
    success: true,
    userId,
    pointsAdded: 20,
    currentClicks: userStateAdditions[userId].clicksCount,
    unlockedBadge,
    userAdditions: userStateAdditions[userId]
  });
});

// 8. User state retrieve
app.get('/api/users/state', (req, res) => {
  res.json({ userStateAdditions });
});

// 9. Moderate Pending Alert Review Queue (Broadcast / Dismiss)
app.post('/api/alerts/moderate', (req, res) => {
  const { alertId, status, userRole, userRegion } = req.body; // status: 'Broadcasted' | 'Dismissed'

  const alertIdx = safetyAlerts.findIndex(a => a.id === alertId);
  if (alertIdx === -1) {
    return res.status(404).json({ success: false, message: 'Alert not found' });
  }

  const alert = safetyAlerts[alertIdx];
  
  // Validation
  if (userRole !== 'super_admin') {
    if (userRole === 'regional_admin') {
      if (alert.region !== userRegion) {
        return res.status(403).json({ success: false, message: `Access denied. Outside assigned region ${userRegion}.` });
      }
    } else {
      return res.status(403).json({ success: false, message: 'Safety actions require HSEQ Admin authorization.' });
    }
  }

  alert.status = status;
  res.json({ success: true, alert, safetyAlerts });
});

function normalizeEmailSubject(subject: string): string {
  return subject.replace(/[A-Za-z]/, firstLetter => firstLetter.toUpperCase());
}

// 10. Gemini Generative AI communications generator
app.post('/api/gemini/draft-alert', async (req, res) => {
  const { campusName, hazardType, temp, visibility, condition, description } = req.body;

  const promptText = `Draft a structured campus safety broadcast alert for a BSS (Beaconhouse School System) campus named "${campusName}" in Pakistan.
The campus is under distress from an extreme environmental hazard: "${hazardType}" (Details: ${description || 'N/A'}. Metric levels: Temp: ${temp ?? 'N/A'}°C, Visibility: ${visibility ?? 'N/A'}km, Condition: ${condition ?? 'N/A'}).
Generate safety directives tailored specifically for BSS students, staff, and parents.

Return your response strictly in JSON format matching the following schema. No extra formatting tools or text outside the raw JSON:
{
  "subject": "Headline with appropriate hazards emoji e.g. 🌫️, 🌩️, ☔",
  "emailBody": "Empathetic, structured, formal, and professional email text advising staff, students, and parents on protective protocols. Must end with the exact mandatory sentence: \\"Real-time tracking of this incident is powered live by regional weather pulse telemetry.\\"",
  "smsVolume": "A highly concise emergency notice of max 140 characters suitable for SMS & WhatsApp broadcast, explaining status and action."
}`;

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
    // Graceful fallback copy buffer
    console.warn('GEMINI_API_KEY is not configured or left as default. Relying on default fallbacks.');
    const fallback = {
      subject: `⚠️ Urgent Safety Broadcast: ${hazardType} Alert for ${campusName}`,
      emailBody: `Dear Beaconhouse Family and School Leaders,\n\nWe are actively monitoring severe meteorological conditions near ${campusName}. In response to the active ${hazardType} indicators (Temp: ${temp ?? 'N/A'}°C, Visibility: ${visibility ?? 'N/A'}km, Condition: ${condition ?? 'N/A'}), we urge all staff and students to prioritize safety protocols.\n\nPrecautionary Directives:\n- Face masks remain compulsory for outdoor activities.\n- Physical education and outdoor assemblies are temporarily suspended.\n- Parents and drivers are requested to observe caution during peak transport hours.\n\nOur onsite facilities team is constantly coordinating updates.\n\nReal-time tracking of this incident is powered live by regional weather pulse telemetry.`,
      smsVolume: `BSS Alert: ${hazardType} dispatch active for ${campusName}. Precautionary guidelines apply. Check inbox for emails. Real-time safety active.`
    };
    return res.json({ success: true, fallback: true, ...fallback });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            emailBody: { type: Type.STRING },
            smsVolume: { type: Type.STRING },
          },
          required: ['subject', 'emailBody', 'smsVolume'],
        },
      },
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error('Empty output returned from AI Studio Gemini services');
    }

    const parsed = JSON.parse(outputText);
    res.json({ success: true, ...parsed, subject: normalizeEmailSubject(parsed.subject) });
  } catch (error: any) {
    console.error('Gemini communication generation failed:', error);
    // Graceful fallback standard response
    const fallback = {
      subject: `⚠️ Urgent Safety Broadcast: ${hazardType} Alert for ${campusName}`,
      emailBody: `Dear Beaconhouse Family and School Leaders,\n\nWe are actively monitoring severe meteorological conditions near ${campusName}. In response to the active ${hazardType} indicators (Temp: ${temp ?? 'N/A'}°C, Visibility: ${visibility ?? 'N/A'}km, Condition: ${condition ?? 'N/A'}), we urge all staff and students to prioritize safety protocols.\n\nPrecautionary Directives:\n- Face masks remain compulsory for outdoor activities.\n- Physical education and outdoor assemblies are temporarily suspended.\n- Parents and drivers are requested to observe caution during peak transport hours.\n\nOur onsite facilities team is constantly coordinating updates.\n\nReal-time tracking of this incident is powered live by regional weather pulse telemetry.`,
      smsVolume: `BSS Alert: ${hazardType} dispatch active for ${campusName}. Precautionary guidelines apply. Check inbox for emails. Real-time safety active.`
    };
    res.json({ success: true, fallback: true, ...fallback });
  }
});

// 11. Real email broadcast via SendGrid
const ALERT_RECIPIENT_EMAILS = (process.env.ALERT_RECIPIENT_EMAIL || 'aymen.abdullah@bh.edu.pk')
  .split(',')
  .map(email => email.trim())
  .filter(Boolean);
const FROM_EMAIL = 'no-reply@bcp.net.pk';

const sgMail = {
  async send(message: { from: { email: string; name: string }; to: string[]; subject: string; html: string }) {
    const sgApiKey = process.env.SENDGRID_API_KEY;
    if (!sgApiKey) {
      throw new Error('SENDGRID_API_KEY not configured.');
    }

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sgApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: message.to.map(email => ({ email })) }],
        from: message.from,
        subject: message.subject,
        content: [{ type: 'text/html', value: message.html }],
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`SendGrid rejected request (${response.status}): ${details}`);
    }
  },
};

app.post('/api/broadcast/email', async (req, res) => {
  const { subject, emailBody, campusName, campusId, region } = req.body;

  const sgApiKey = process.env.SENDGRID_API_KEY;

  if (!sgApiKey || sgApiKey === 'REPLACE_WITH_SENDGRID_API_KEY') {
    console.warn('[Email] SENDGRID_API_KEY not configured — email broadcast skipped.');
    return res.json({
      success: false,
      skipped: true,
      message: 'Email skipped: SENDGRID_API_KEY not configured.'
    });
  }

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background: #054593; padding: 20px 24px;">
        <p style="margin: 0; color: #f2a900; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Beaconhouse School System — HSEQ</p>
        <h1 style="margin: 4px 0 0; color: #ffffff; font-size: 16px; font-weight: 700;">Beaconhouse Meteorological Watchtower Alert</h1>
      </div>
      <div style="background: #fff7ed; border-bottom: 3px solid #f97316; padding: 12px 24px;">
        <p style="margin: 0; font-size: 12px; color: #9a3412; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
          ⚠️ Safety Dispatch — ${campusName || 'BSS Campus'} · ${region || ''} Region · ${campusId || ''}
        </p>
      </div>
      <div style="padding: 24px; background: #ffffff;">
        <h2 style="margin: 0 0 16px; font-size: 18px; color: #1e293b;">${subject}</h2>
        <div style="font-size: 14px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${emailBody}</div>
      </div>
      <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px;">
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          Delivered by BMW (Beaconhouse Meteorological Watchtower) · Pakistan Safety Operations Centre<br/>
          This is an automated safety dispatch. Do not reply directly to this email.
        </p>
      </div>
    </div>
  `;

  try {
    await sgMail.send({
      from: { email: FROM_EMAIL, name: 'BMW Safety Dispatch' },
      to: ALERT_RECIPIENT_EMAILS,
      subject: normalizeEmailSubject(subject || `⚠️ BSS Safety Alert — ${campusName}`),
      html: htmlBody,
    });

    console.log(`[Email] Safety dispatch sent to ${ALERT_RECIPIENT_EMAILS.join(', ')} via SendGrid`);
    res.json({ success: true, sentTo: ALERT_RECIPIENT_EMAILS.join(', ') });

  } catch (err: any) {
    console.error('[Email] SendGrid error:', err?.response?.body || err.message);
    res.status(500).json({ success: false, message: err?.response?.body?.errors?.[0]?.message || err.message });
  }
});

// Serve frontend SPA or configure hot-reloading Vite dev middleware depending on environment
let isViteApplied = false;

if (process.env.NODE_ENV !== 'production') {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[BMW] Vite developer middleware active. On-the-fly transpilation enabled.');
    isViteApplied = true;
  } catch (err) {
    console.warn('[BMW] Failed to initialize Vite dev middleware, falling back to static serving:', err);
  }
}

if (!isViteApplied) {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
  console.log('[BMW] Serving compiled static assets from dist/ directory.');
}

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BMW] Beaconhouse Meteorological Watchtower is broadcasting live on port ${PORT}`);
});
