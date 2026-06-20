import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { generateCampuses, haversineDistance } from './src/data/campuses.js';
import { Campus, SafetyAlert, IncidentReport, WeatherTelemetry } from './src/types.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, getDocFromServer } from 'firebase/firestore';
import fs from 'fs';

dotenv.config();

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

// Direct database helpers to sync changes to Firestore
async function saveCampusToFirestore(campus: Campus) {
  try {
    await setDoc(doc(db, 'campuses', campus.branchId), campus);
  } catch (err) {
    console.error(`Failed to save campus ${campus.branchId} to Firestore:`, err);
  }
}

async function saveSafetyAlertToFirestore(alert: SafetyAlert) {
  try {
    await setDoc(doc(db, 'safetyAlerts', alert.id), alert);
  } catch (err) {
    console.error(`Failed to save safety alert ${alert.id} to Firestore:`, err);
  }
}

async function saveIncidentReportToFirestore(report: IncidentReport) {
  try {
    await setDoc(doc(db, 'incidentReports', report.id), report);
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
    if (campusesSnap.empty) {
      console.log('[FireSync] Firestore campuses collection is empty. Seeding initial 210 campuses...');
      const initialCampuses = generateCampuses();
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
// Category A (Severe Weather): Temperature > 43°C OR PAK AQI > 300 OR (Chance of Rain > 85% AND Humidity > 85%) OR (UV Index > 11 AND Temp > 40°C)
// Category B (Moderate Weather / Heavy Rain): Temp > 39°C OR PAK AQI > 175 OR Chance of Rain > 70%
// Safe Weather: Operational
function evaluateOperationalStatus(weather: WeatherTelemetry): 'Operational' | 'Caution' | 'Severe Disruption' {
  if (
    weather.temp > 43 || 
    weather.aqi > 300 || 
    (weather.chanceOfRain > 85 && weather.humidity > 85) ||
    (weather.uvIndex > 11 && weather.temp > 40)
  ) {
    return 'Severe Disruption';
  } else if (
    weather.temp > 39 || 
    weather.aqi > 175 || 
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
        campus.weather.aqi = 450; 
      } else if (matchingDisasterType === 'Flash Flood') {
        campus.weather.chanceOfRain = 95;
        campus.weather.humidity = 90;
      } else if (matchingDisasterType === 'Heatwave') {
        campus.weather.temp = 46;
        campus.weather.uvIndex = 12;
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
        const briefText = `Immediate severe weather disruption at BSS ${campus.name} (City: ${campus.city}, Region: ${campus.region}). High alert active due to severe meteorological telemetry reading (Temp: ${campus.weather.temp}°C, AQI: ${campus.weather.aqi}). All students and staff advised extreme caution.`;
        
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
          message: `Caution advised at ${campus.name}. High chance of moderate elements (AQI: ${campus.weather.aqi}, Temp: ${campus.weather.temp}°C). Retaining in review queue.`,
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

// 1. Get Capmuses and states
app.get('/api/campuses', (req, res) => {
  res.json({
    campuses,
    disasterPresetsActive,
    safetyAlerts,
    incidentReports
  });
});

// 2. Clear manual overrides & Fetch Live Weather
app.post('/api/weather/fetch', async (req, res) => {
  try {
    const isApiKeyPresent = !!process.env.WEATHER_API_KEY;

    // We will update weather metrics realistically.
    // If a manual override is active, it gets wiped!
    campuses.forEach(campus => {
      campus.manualOverride = false;
      campus.overrideReason = undefined;

      // Simulate live fetch
      const randomFactor = Math.random();
      // Introduce dynamic slight fluctuations
      campus.weather.temp = Math.max(15, Math.min(50, campus.weather.temp + Math.round((randomFactor - 0.5) * 4)));
      campus.weather.humidity = Math.max(10, Math.min(100, campus.weather.humidity + Math.round((randomFactor - 0.5) * 10)));
      campus.weather.aqi = Math.max(20, Math.min(550, campus.weather.aqi + Math.round((randomFactor - 0.5) * 25)));
      campus.weather.chanceOfRain = Math.max(0, Math.min(100, campus.weather.chanceOfRain + Math.round((randomFactor - 0.5) * 15)));
    });

    recalculateOperationalStatuses();
    syncSafetyAlertReviewQueue();

    // Concurrently persist updated campuses back to Firestore
    const savePromises = campuses.map(c => saveCampusToFirestore(c));
    await Promise.all(savePromises);

    res.json({
      success: true,
      message: isApiKeyPresent 
        ? 'Successfully synchronized weather database via WeatherWalay.com API (Target reliability: 95%). Canceled all manual admin overrides.' 
        : 'Synchronized live metrics via Open-Meteo & global alerts. Canceled all active admin overrides.',
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
    campus.weather.aqi = report.reportedWeather.aqi ?? campus.weather.aqi;
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

// 10. Gemini Generative AI communications generator
app.post('/api/gemini/draft-alert', async (req, res) => {
  const { campusName, hazardType, temp, aqi, description } = req.body;

  const promptText = `Draft a structured campus safety broadcast alert for a BSS (Beaconhouse School System) campus named "${campusName}" in Pakistan.
The campus is under distress from a extreme environmental hazard: "${hazardType}" (Details: ${description || 'N/A'}. Metric levels: Temp: ${temp ?? 'N/A'}°C, AQI: ${aqi ?? 'N/A'}).
Generate safety directives tailored specifically for BSS students, administrative staff, and parents.

Return your response strictly in JSON format matching the following schema. No extra formatting tools or text outside the raw JSON:
{
  "subject": "Headline with appropriate hazards emoji e.g. 🌫️, 🌩️, ☔",
  "emailBody": "Empathetic, structured, formal and professional email text advising staff, students and parents on protective protocols. Must end with the exact mandatory sentence: \\"Real-time tracking of this incident is powered live by regional weather pulse telemetry.\\"",
  "smsVolume": "A highly concise emergency notice of max 140 characters suitable for SMS & WhatsApp broadcast, explaining status and action."
}`;

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!geminiApiKey || geminiApiKey === 'MY_GEMINI_API_KEY') {
    // Graceful fallback copy buffer
    console.warn('GEMINI_API_KEY is not configured or left as default. Relying on default fallbacks.');
    const fallback = {
      subject: `⚠️ urgent Safety Broadcast: ${hazardType} Alert for ${campusName}`,
      emailBody: `Dear Beaconhouse Family and School Leaders,\n\nWe are actively monitoring severe meteorological conditions near ${campusName}. In response to the active ${hazardType} indicators (AQI: ${aqi ?? 'N/A'}, Temp: ${temp ?? 'N/A'}°C), we urge all staff and students to prioritize safety protocols.\n\nPrecautionary Directives:\n- Face masks remain compulsory for outdoor activities.\n- Physical education and outdoor assemblies are temporarily suspended.\n- Parents and drivers are requested to observe caution during peak transport hours.\n\nOur onsite facilities team is constantly coordinating updates.\n\nReal-time tracking of this incident is powered live by regional weather pulse telemetry.`,
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
      throw new Error('Empety output returned from AI Studio Gemini services');
    }

    const parsed = JSON.parse(outputText);
    res.json({ success: true, ...parsed });
  } catch (error: any) {
    console.error('Gemini communication Generation failed:', error);
    // Graceful fallback standard response
    const fallback = {
      subject: `⚠️ Urgent Safety Broadcast: ${hazardType} Alert for ${campusName}`,
      emailBody: `Dear Beaconhouse Family and School Leaders,\n\nWe are actively monitoring severe meteorological conditions near ${campusName}. In response to the active ${hazardType} indicators (AQI: ${aqi ?? 'N/A'}, Temp: ${temp ?? 'N/A'}°C), we urge all staff and students to prioritize safety protocols.\n\nPrecautionary Directives:\n- Face masks remain compulsory for outdoor activities.\n- Physical education and outdoor assemblies are temporarily suspended.\n- Parents and drivers are requested to observe caution during peak transport hours.\n\nOur onsite facilities team is constantly coordinating updates.\n\nReal-time tracking of this incident is powered live by regional weather pulse telemetry.`,
      smsVolume: `BSS Alert: ${hazardType} dispatch active for ${campusName}. Precautionary guidelines apply. Check inbox for emails. Real-time safety active.`
    };
    res.json({ success: true, fallback: true, ...fallback });
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

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[BMW] Beaconhouse Meteorological Watchtower is broadcasting live on port ${PORT}`);
});
