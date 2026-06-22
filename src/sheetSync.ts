/**
 * Google Sheet → Campus Data Sync
 * Fetches real BSS campus data from the published Google Sheet CSV.
 * Falls back to city-level coordinates when precise pin is unavailable.
 */

import { Campus, WeatherTelemetry } from './types.js';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/15RCCqpfyc1EDEZKq5KDauIBob1pbM9hJsnPr2UMuLHQ/export?format=csv';

// City-level coordinate fallbacks covering all BSS cities
const CITY_COORDS: Record<string, { lat: number; lng: number; region: 'Centre' | 'South' | 'North' }> = {
  'Lahore':           { lat: 31.5204, lng: 74.3587, region: 'Centre' },
  'Multan':           { lat: 30.1575, lng: 71.5249, region: 'Centre' },
  'Faisalabad':       { lat: 31.4504, lng: 73.1350, region: 'Centre' },
  'Gujranwala':       { lat: 32.1877, lng: 74.1945, region: 'Centre' },
  'Sialkot':          { lat: 32.4945, lng: 74.5229, region: 'Centre' },
  'Sahiwal':          { lat: 30.6682, lng: 73.1114, region: 'Centre' },
  'Okara':            { lat: 30.8081, lng: 73.4452, region: 'Centre' },
  'Hafizabad':        { lat: 32.0710, lng: 73.6882, region: 'Centre' },
  'Sheikhupura':      { lat: 31.7131, lng: 73.9783, region: 'Centre' },
  'Jhang':            { lat: 31.2779, lng: 72.3289, region: 'Centre' },
  'Sargodha':         { lat: 32.0740, lng: 72.6861, region: 'Centre' },
  'Bahawalpur':       { lat: 29.3544, lng: 71.6911, region: 'Centre' },
  'Rahim Yar Khan':   { lat: 28.4195, lng: 70.3025, region: 'Centre' },
  'Sadiqabad':        { lat: 28.3087, lng: 70.1299, region: 'Centre' },
  'Toba Tek Singh':   { lat: 30.9709, lng: 72.4823, region: 'Centre' },
  'Gojra':            { lat: 31.1489, lng: 72.6826, region: 'Centre' },
  'Islamabad':        { lat: 33.6844, lng: 73.0479, region: 'North' },
  'Rawalpindi':       { lat: 33.5997, lng: 73.0363, region: 'North' },
  'Wah Cantt':        { lat: 33.7743, lng: 72.7521, region: 'North' },
  'Attock':           { lat: 33.7667, lng: 72.3600, region: 'North' },
  'Jhelum':           { lat: 32.9405, lng: 73.7276, region: 'North' },
  'Gujrat':           { lat: 32.5742, lng: 74.0754, region: 'North' },
  'Mirpur':           { lat: 33.1484, lng: 73.7508, region: 'North' },
  'Kharian':          { lat: 32.8167, lng: 73.8833, region: 'North' },
  'Chakwal':          { lat: 32.9319, lng: 72.8526, region: 'North' },
  'Peshawar':         { lat: 34.0151, lng: 71.5249, region: 'North' },
  'Swat':             { lat: 34.7718, lng: 72.3602, region: 'North' },
  'Mardan':           { lat: 34.1986, lng: 72.0435, region: 'North' },
  'Nowshera':         { lat: 34.0153, lng: 71.9747, region: 'North' },
  'Abbottabad':       { lat: 34.1688, lng: 73.2215, region: 'North' },
  'Mansehra':         { lat: 34.3289, lng: 73.1967, region: 'North' },
  'Muzaffarabad':     { lat: 34.3700, lng: 73.4711, region: 'North' },
  'Mandi Bahauddin':  { lat: 32.5861, lng: 73.4917, region: 'North' },
  'Risalpur':         { lat: 34.0667, lng: 71.9833, region: 'North' },
  'Karachi':          { lat: 24.8607, lng: 67.0011, region: 'South' },
  'Hyderabad':        { lat: 25.3960, lng: 68.3578, region: 'South' },
  'Nawabshah':        { lat: 26.2483, lng: 68.4096, region: 'South' },
  'Sukkur':           { lat: 27.7244, lng: 68.8475, region: 'South' },
  'Thatta':           { lat: 24.7461, lng: 67.9239, region: 'South' },
  'Quetta':           { lat: 30.1798, lng: 66.9750, region: 'South' },
};

interface SheetRow {
  region: string;
  branchId: string;
  cluster: string;
  name: string;
  city: string;
  shId: string;
  schoolHead: string;
  schoolHeadContact: string;
  shEmail: string;
  address: string;
  phone: string;
  mapsUrl: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function generateInitialWeather(city: string): WeatherTelemetry {
  const warmCities = ['Karachi', 'Multan', 'Hyderabad', 'Sukkur', 'Rahim Yar Khan', 'Thatta'];
  const coolCities = ['Quetta', 'Abbottabad', 'Mansehra', 'Swat', 'Muzaffarabad'];

  let temp = 30 + Math.round(Math.random() * 8);

  if (warmCities.includes(city)) temp = 34 + Math.round(Math.random() * 8);
  if (coolCities.includes(city)) temp = 18 + Math.round(Math.random() * 8);

  return {
    temp,
    humidity: 40 + Math.round(Math.random() * 45),
    chanceOfRain: Math.round(Math.random() * 70),
    windSpeed: 5 + Math.round(Math.random() * 20),
    uvIndex: 4 + Math.round(Math.random() * 7),
    cloudCover: 20 + Math.round(Math.random() * 60),
    feelsLike: temp + Math.round((Math.random() - 0.5) * 4),
    visibility: 5 + Math.round(Math.random() * 15),
    weatherCondition: 'Clear',
  };
}

/**
 * Try to extract lat/lng from a maps.app.goo.gl or share.google short URL.
 * Fetches the page and parses the og:image meta tag which contains:
 *   center=LAT%2CLNG
 * Returns null if extraction fails.
 */
export async function extractCoordsFromMapsUrl(url: string): Promise<{ lat: number; lng: number } | null> {
  if (!url || url === '-') return null;
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(6000) });
    const html = await res.text();
    // Pattern from og:image: center=24.782978%2C67.0835545
    const match = html.match(/center=([-\d.]+)%2C([-\d.]+)/);
    if (match) {
      return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
    }
    // Fallback: look for @lat,lng in redirect URL or inline
    const atMatch = html.match(/@([-\d.]+),([-\d.]+)/);
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }
  } catch {
    // silently ignore timeouts / network errors
  }
  return null;
}

export async function fetchCampusesFromSheet(): Promise<Campus[]> {
  console.log('[SheetSync] Fetching campus data from Google Sheet...');

  const response = await fetch(SHEET_CSV_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch sheet: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();
  const lines = csvText.split('\n').filter(l => l.trim().length > 0);

  // First line is headers
  const headers = parseCSVLine(lines[0]);
  console.log(`[SheetSync] Sheet headers: ${headers.join(' | ')}`);

  const rows: SheetRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 6) continue;
    rows.push({
      region: cols[0] || '',
      branchId: cols[1] || '',
      cluster: cols[2] || '',
      name: cols[3] || '',
      city: cols[4] || '',
      shId: cols[5] || '',
      schoolHead: cols[6] || '',
      schoolHeadContact: cols[7] || '',
      shEmail: cols[8] || '',
      address: cols[9] || '',
      phone: cols[10] || '',
      mapsUrl: cols[11] || '',
    });
  }

  console.log(`[SheetSync] Parsed ${rows.length} campus rows from sheet.`);

  const campuses: Campus[] = [];
  let skipped = 0;
  let coordsFromMaps = 0;
  let coordsFromCity = 0;

  // Pre-fetch coordinates from maps.app.goo.gl URLs in parallel (only those URLs, skip share.google)
  // Batch to avoid hammering Google servers — process in groups of 10
  const mapsRows = rows.filter(r => r.mapsUrl && r.mapsUrl.includes('maps.app.goo.gl'));
  const coordCache: Record<string, { lat: number; lng: number }> = {};

  console.log(`[SheetSync] Fetching precise coordinates from ${mapsRows.length} Google Maps URLs...`);
  const BATCH = 10;
  for (let i = 0; i < mapsRows.length; i += BATCH) {
    const batch = mapsRows.slice(i, i + BATCH);
    await Promise.all(batch.map(async row => {
      const coords = await extractCoordsFromMapsUrl(row.mapsUrl);
      if (coords) coordCache[row.branchId] = coords;
    }));
    // Small delay between batches
    if (i + BATCH < mapsRows.length) await new Promise(r => setTimeout(r, 500));
  }
  console.log(`[SheetSync] Resolved precise coordinates for ${Object.keys(coordCache).length} campuses.`);

  for (const row of rows) {
    if (!row.branchId || !row.name || !row.city) {
      skipped++;
      continue;
    }

    // Normalize region
    const regionRaw = row.region.trim();
    let region: 'Centre' | 'South' | 'North' = 'Centre';
    if (regionRaw === 'North') region = 'North';
    else if (regionRaw === 'South') region = 'South';

    // Get coordinates: prefer real pin from Maps URL, fallback to city-level
    const cityData = CITY_COORDS[row.city.trim()];
    if (!cityData) {
      console.warn(`[SheetSync] Unknown city "${row.city}" for branch ${row.branchId} — skipping.`);
      skipped++;
      continue;
    }

    let lat: number;
    let lng: number;

    if (coordCache[row.branchId]) {
      lat = coordCache[row.branchId].lat;
      lng = coordCache[row.branchId].lng;
      coordsFromMaps++;
    } else {
      // City-level with small random scatter so pins don't all stack
      lat = cityData.lat + (Math.random() - 0.5) * 0.08;
      lng = cityData.lng + (Math.random() - 0.5) * 0.08;
      coordsFromCity++;
    }

    const weather = generateInitialWeather(row.city.trim());

    campuses.push({
      branchId: `BSS-${row.branchId.padStart(3, '0')}`,
      name: row.name.trim(),
      region: cityData.region,
      city: row.city.trim(),
      latitude: lat,
      longitude: lng,
      active: true,
      weather,
      operationalStatus: 'Operational',
      manualOverride: false,
    } as Campus);
  }

  console.log(`[SheetSync] ✅ Loaded ${campuses.length} campuses. Precise pins: ${coordsFromMaps}, City-level: ${coordsFromCity}, Skipped: ${skipped}`);
  return campuses;
}
