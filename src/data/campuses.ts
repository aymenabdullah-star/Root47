import { Campus, DisasterPreset, UserProfile, WeatherTelemetry } from '../types';

export interface CityInfo {
  name: string;
  region: 'Centre' | 'South' | 'North';
  lat: number;
  lng: number;
  weight: number; // Number of campuses to allocate
}

export const CITIES: CityInfo[] = [
  { name: 'Lahore', region: 'Centre', lat: 31.5204, lng: 74.3587, weight: 35 },
  { name: 'Karachi', region: 'South', lat: 24.8607, lng: 67.0011, weight: 35 },
  { name: 'Islamabad', region: 'North', lat: 33.6844, lng: 73.0479, weight: 25 },
  { name: 'Rawalpindi', region: 'North', lat: 33.5997, lng: 73.0363, weight: 20 },
  { name: 'Peshawar', region: 'North', lat: 34.0151, lng: 71.5249, weight: 10 },
  { name: 'Multan', region: 'Centre', lat: 30.1575, lng: 71.5249, weight: 10 },
  { name: 'Faisalabad', region: 'Centre', lat: 31.4504, lng: 73.1350, weight: 10 },
  { name: 'Sialkot', region: 'Centre', lat: 32.4945, lng: 74.5229, weight: 6 },
  { name: 'Gujranwala', region: 'Centre', lat: 32.1877, lng: 74.1945, weight: 6 },
  { name: 'Hyderabad', region: 'South', lat: 25.3960, lng: 68.3578, weight: 6 },
  { name: 'Quetta', region: 'South', lat: 30.1798, lng: 66.9750, weight: 5 },
  { name: 'Abbottabad', region: 'North', lat: 34.1688, lng: 73.2215, weight: 4 },
  { name: 'Bahawalpur', region: 'Centre', lat: 29.3544, lng: 71.6911, weight: 4 },
  { name: 'Sargodha', region: 'Centre', lat: 32.0740, lng: 72.6861, weight: 3 },
  { name: 'Sukkur', region: 'South', lat: 27.7244, lng: 68.8475, weight: 3 },
  { name: 'Gujrat', region: 'Centre', lat: 32.5742, lng: 74.0754, weight: 3 },
  { name: 'Sahiwal', region: 'Centre', lat: 30.6682, lng: 73.1114, weight: 3 },
  { name: 'Okara', region: 'Centre', lat: 30.8081, lng: 73.4452, weight: 2 },
  { name: 'Sheikhupura', region: 'Centre', lat: 31.7131, lng: 73.9783, weight: 2 },
  { name: 'Jhelum', region: 'North', lat: 32.9405, lng: 73.7276, weight: 2 },
  { name: 'Jhang', region: 'Centre', lat: 31.2779, lng: 72.3289, weight: 2 },
  { name: 'Wah Cantt', region: 'North', lat: 33.7743, lng: 72.7521, weight: 2 },
  { name: 'Mardan', region: 'North', lat: 34.1986, lng: 72.0435, weight: 2 },
  { name: 'Kohat', region: 'North', lat: 33.5856, lng: 71.4429, weight: 1 },
  { name: 'Swat', region: 'North', lat: 34.7718, lng: 72.3602, weight: 2 },
  { name: 'Rahim Yar Khan', region: 'Centre', lat: 28.4195, lng: 70.3025, weight: 2 },
  { name: 'Mirpur (AJK)', region: 'North', lat: 33.1484, lng: 73.7508, weight: 2 },
  { name: 'Muzaffarabad', region: 'North', lat: 34.3700, lng: 73.4711, weight: 2 },
  { name: 'Gwadar', region: 'South', lat: 25.1216, lng: 62.3254, weight: 1 },
  { name: 'Larkana', region: 'South', lat: 27.5589, lng: 68.2049, weight: 2 },
  { name: 'Nawabshah', region: 'South', lat: 26.2483, lng: 68.4096, weight: 1 },
  { name: 'Khairpur', region: 'South', lat: 27.5295, lng: 68.7592, weight: 1 },
  { name: 'Haripur', region: 'North', lat: 33.9984, lng: 72.9333, weight: 1 },
  { name: 'Dera Ghazi Khan', region: 'Centre', lat: 30.0510, lng: 70.6358, weight: 1 },
  { name: 'Dera Ismail Khan', region: 'North', lat: 31.8314, lng: 70.9019, weight: 1 },
  { name: 'Bannu', region: 'North', lat: 32.9854, lng: 70.6027, weight: 1 },
  { name: 'Charsadda', region: 'North', lat: 34.1481, lng: 71.7406, weight: 1 },
  { name: 'Kasur', region: 'Centre', lat: 31.1179, lng: 74.4484, weight: 1 },
  { name: 'Kotli', region: 'North', lat: 33.5158, lng: 73.9019, weight: 1 },
];

export const DISASTER_PRESETS: DisasterPreset[] = [
  {
    id: 'hazard-smog-lahore',
    name: 'Lahore Smog Winter Emergency',
    city: 'Lahore',
    latitude: 31.5204,
    longitude: 74.3587,
    radiusKm: 12,
    hazardType: 'Smog',
    severity: 'Category A',
    description: 'Extreme seasonal hazardous PM2.5 particulate inversion covering Central Lahore.'
  },
  {
    id: 'hazard-flood-islamabad',
    name: 'Islamabad E-11 Cloudburst & Flash Flood',
    city: 'Islamabad',
    latitude: 33.7150,
    longitude: 73.0120,
    radiusKm: 12,
    hazardType: 'Flash Flood',
    severity: 'Category A',
    description: 'Sudden high-intensity cloudburst over Margalla Hills causing severe urban runoffs.'
  },
  {
    id: 'hazard-heat-karachi',
    name: 'Karachi Coastal Heatwave Blockade',
    city: 'Karachi',
    latitude: 24.8450,
    longitude: 67.0200,
    radiusKm: 12,
    hazardType: 'Heatwave',
    description: 'Humid sea breeze cessation leading to high heat index readings over central districts.',
    severity: 'Category A'
  }
];

export const MOCK_NOTIFICATIONS_INITIAL = [
  {
    id: 'notif-1',
    type: 'whatsapp' as const,
    sender: 'BSS Safety Broadcast',
    title: '⚠️ EMERGENCY ALERT',
    message: 'Extreme environmental triggers detected for Lahore region. Check your School Safety Dashboard for Category A dispatches.',
    timestamp: '08:45 AM',
    read: false,
  },
  {
    id: 'notif-2',
    type: 'sms' as const,
    sender: '+92-300-BSSSAFE',
    title: 'BMW Dispatch Center',
    message: 'BSS-012 (Johar Town Campus) has moved into PENDING REVIEW status due to Heavy Rainfall (Category B). Regional Admin review required.',
    timestamp: '09:12 AM',
    read: false,
  },
  {
    id: 'notif-3',
    type: 'gsuite' as const,
    sender: 'Aymen Abdullah <hseq@bh.edu.pk>',
    title: 'BMW Safety Notification Dispatch',
    message: 'Safety directives have changed for the North Region. Mask compliance is now mandatory in smog-prone campuses. Please read safety briefs.',
    timestamp: '09:30 AM',
    read: false,
  }
];

export const MOCK_USER_PROFILES: UserProfile[] = [
  {
    id: 'profile-super-aymen',
    name: 'Aymen Abdullah',
    email: 'aymen.abdullah@bh.edu.pk',
    role: 'super_admin',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    points: 820,
    badges: ['Awareness Ranger', 'Safety Vanguard']
  },
  {
    id: 'profile-super-ali',
    name: 'Ali Ahmad Khan',
    email: 'ali.ahmad@bh.edu.pk',
    role: 'super_admin',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    points: 650,
    badges: ['Safety Vanguard']
  },
  {
    id: 'profile-reg-majid',
    name: 'Majid Ali Qureshi',
    email: 'majid.qureshi@bh.edu.pk',
    role: 'regional_admin',
    region: 'Centre',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    points: 340,
    badges: ['Awareness Ranger']
  },
  {
    id: 'profile-reg-ahsan',
    name: 'Ahsan Afzaal',
    email: 'ahsan.afzaal@bh.edu.pk',
    role: 'regional_admin',
    region: 'South',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    points: 410,
    badges: ['Awareness Ranger']
  },
  {
    id: 'profile-reg-khwaja',
    name: 'Khwaja Latif Haider',
    email: 'khwaja.haider@bh.edu.pk',
    role: 'regional_admin',
    region: 'North',
    avatarUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    points: 290,
    badges: ['Safety Vanguard']
  },
  {
    id: 'profile-head-sumaiya',
    name: 'Sumaiya Zohaib (Lahore)',
    email: 'sumaiya.zohaib@bh.edu.pk',
    role: 'school_head',
    campusId: 'BSS-001',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    points: 150,
    badges: []
  },
  {
    id: 'profile-head-larry',
    name: 'Larry Savery (Karachi)',
    email: 'larry.savery@bh.edu.pk',
    role: 'school_head',
    campusId: 'BSS-036',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
    points: 120,
    badges: []
  },
  {
    id: 'profile-head-hufsa',
    name: 'Hufsa Awan (Islamabad)',
    email: 'hufsa.awan@bh.edu.pk',
    role: 'school_head',
    campusId: 'BSS-071',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    points: 180,
    badges: ['Awareness Ranger']
  },
  {
    id: 'profile-worker-read',
    name: 'Standard Teacher/Staff',
    email: 'staff.member@bh.edu.pk',
    role: 'read_only',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150',
    points: 40,
    badges: []
  }
];

// Simple LCG Pseudo-Random Number Generator to keep it deterministic but realistic
function createRandom(seed: number) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function generateCampuses(): Campus[] {
  const result: Campus[] = [];
  const random = createRandom(1947); // Deterministic seed (Year of Pakistan Independence!)

  let branchCounter = 1;

  // Let's divide 210 exactly. We will distribute according to the weights
  const totalWeight = CITIES.reduce((sum, c) => sum + c.weight, 0);
  
  // We need exactly 210 campuses
  const targetCount = 210;
  let allocatedCount = 0;

  // Compute exact allocation per city with a standard quota method
  const allocations = CITIES.map((city, idx) => {
    // Last element corrects rounding errors to meet exactly 210
    if (idx === CITIES.length - 1) {
      return targetCount - allocatedCount;
    }
    const quota = Math.max(1, Math.round((city.weight / totalWeight) * targetCount));
    allocatedCount += quota;
    return quota;
  });

  // Verify total allocated count matches exactly 210
  const adjustedAllocations = [...allocations];
  const sumAllocated = adjustedAllocations.reduce((s, x) => s + x, 0);
  if (sumAllocated !== targetCount) {
    adjustedAllocations[0] += (targetCount - sumAllocated);
  }

  const campusNamesByCity: Record<string, string[]> = {
    Lahore: ['Johar Town Campus', 'Gulberg Primary', 'Canal Side Campus', 'Defence Ring Road', 'Model Town Senior', 'Wapda Town Branch', 'Allama Iqbal Town', 'Samanabad Campus', 'Valencia Town Branch', 'Shalamar Campus', 'State Life Branch', 'Paragon Campus', 'Sabzazar Branch', 'Sujoke Colony', 'Chuburji Junior', 'Garhi Shahu Campus', 'Cavalry Ground Boys', 'DHA Phase 6 Senior', 'Green Town Junior', 'Mughalpura Girls', 'Baghbanpura Branch', 'Nishtar Colony', 'Harbanspura School', 'Raiwind Senior', 'Township Branch', 'Gulshan-e-Ravi Boys', 'Garden Town Girls', 'Lower Mall Academy', 'Palm Tree Campus', 'Elite Senior Lahore', 'Icon Boys Gulberg', 'Beaconhouse Liberty Girls', 'DHA Phase V Junior', 'Saddar Branch', 'Lake City Academy'],
    Karachi: ['PECHS Middle School', 'Clifton Senior Girls', 'Gulshan-e-Iqbal Branch', 'North Nazimabad Primary', 'Korangi Industrial Campus', 'Malir Cantt Boys', 'Defence Senior Phase 4', 'Jubilee Campus Clifton', 'FB Area Academy', 'Steel Town Branch', 'Gulberg Girls Karachi', 'Gulistan-e-Jauhar Primary', 'Saddar Boys Branch', 'Karimabad Academy', 'Defence Phase VIII Campus', 'Surjani Town Branch', 'Orangi Junior', 'Liaquatabad Secondary', 'Keamari Maritime', 'Airport Seniors', 'Gulshan Block 13 Primary', 'Sohrab Goth Branch', 'North Karachi Boys', 'Civil Lines Junior', 'Bath Island Senior', 'DHA Phase 2 Girls', 'Nazimabad Boys Ring', 'Gulberg Primary III', 'Safiat Town Branch', 'Bahadurabad Girls', 'Rashid Minhas Campus', 'Defence Phase 6 Girls', 'Malir Senior', 'Korangi Junior High', 'Jauhar Town Secondary'],
    Islamabad: ['Margalla Campus Boys', 'Civil Lines Islamabad', 'G-11 Senior Branch', 'F-10 Primary Girls', 'Model Town Islamabad', 'E-11 Junior', 'F-7 Kindergarten', 'I-8 Academy', 'CBR Town Campus', 'Bani Gala Heights', 'G-15 Sector Branch', 'DHA Phase II Secondary', 'E-11/4 Girls Senior', 'F-11/3 Boys Academy', 'G-6 Main Campus', 'F-8 Girls Branch', 'H-8 Science Campus', 'Soan Gardens Academy', 'Bahria Enclave School', 'Naval Anchorage Junior', 'G-10 Boys Primary', 'G-9 Sectors Academy', 'Chatha Bakhtawar Branch', 'Bhara Kahu Prep', 'F-10 Boys Secondary'],
    Rawalpindi: ['Satellite Town Girls', 'Lalazar Boys Campus', 'Saddar Academy Rawalpindi', 'Adyala Road Branch', 'Harley Street Girls', 'Chaklala Scheme III Senior', 'Peshawar Road Boys', 'Westridge Juniors', 'Bahria Town Phase 4', 'Airport Road Prep', 'Gulrez Town Campus', 'Commercial Market Girls', 'Kashmir Road Primary', 'Pindi Boys Senior', 'High Street Branch', 'Lalazar Juniors', 'Adyala Road Boys II', 'Peshawar Road Primary', 'Saddar Girls Academy', 'Chaklala Junior'],
    Peshawar: ['Khyber Campus Seniors', 'Jamrud Road Branch', 'University Town Primary', 'Hayatabad Phase 4 Girls', 'Peshawar Cantt Boys', 'Ring Road Junior', 'Charsadda Road Academy', 'GT Road Seniors', 'Hayatabad Phase 2', 'Khyber Girls Prep'],
    Multan: ['Boson Road Girls', 'Officer Colony Senior', 'Gulgasht Academy', 'Multan Cantt Boys', 'Shalimar Colony Branch', 'Nishtar Estate Road', 'Vehari Road Girls', 'Model Town Multan', 'Sahu Chowk Branch', 'Multan Prep Junior'],
    Faisalabad: ['East Canal Road Boys', 'Samanabad Faisalabad', 'Civil Lines Senior Girls', 'People’s Colony Campus', 'Batala Colony Academy', 'Madina Town Branch', 'Faisalabad Cantt Girls', 'Sargodha Road Primary', 'Jaranwala Road School', 'East Canal Junior III'],
  };

  CITIES.forEach((city, cityIdx) => {
    const quota = adjustedAllocations[cityIdx];
    const customNames = campusNamesByCity[city.name] || [];

    for (let i = 0; i < quota; i++) {
      const branchId = `BSS-${branchCounter.toString().padStart(3, '0')}`;
      branchCounter++;

      // Compute precise coordinates - offset slightly from city coordinates to scatter them
      const latOffset = (random() - 0.5) * 0.12; // Scatters up to ~12-15km
      const lngOffset = (random() - 0.5) * 0.12;

      // Assign an authentic-sounding campus name, fallback if we run out of presets
      const nameSuffix = customNames[i] || `Campus ${i + 1}`;
      const name = `${city.name} - ${nameSuffix}`;

      // Simulate initial realistic weather based on typical Pakistan seasonal weather
      // Note: Pakistan can have very high temperatures in June, heavy rain, bad smog in winter.
      const isWarmCity = ['Karachi', 'Multan', 'Hyderabad', 'Sukkur', 'Rahim Yar Khan'].includes(city.name);
      
      let temp = isWarmCity ? 34 + Math.round(random() * 8) : 28 + Math.round(random() * 8); // 28 - 42C
      let humidity = 40 + Math.round(random() * 45); // 40 - 85%
      let chanceOfRain = Math.round(random() * 85); 
      let windSpeed = 5 + Math.round(random() * 25); // 5 - 30 km/h
      let aqi = 60 + Math.round(random() * 180); // 60 - 240
      let uvIndex = 4 + Math.round(random() * 8); // 4 - 12

      // Make certain cities have specific weather traits
      if (city.name === 'Lahore') {
        aqi = 250 + Math.round(random() * 180); // Smoggy
      } else if (city.name === 'Karachi') {
        humidity = 70 + Math.round(random() * 20); // Coastal humid
        temp = 32 + Math.round(random() * 6);
      } else if (city.name === 'Quetta') {
        temp = 20 + Math.round(random() * 8); // Cooler highlands
        humidity = 20 + Math.round(random() * 20);
      } else if (city.name === 'Islamabad' || city.name === 'Peshawar') {
        chanceOfRain = 30 + Math.round(random() * 60); // Monsoon influence
      }

      const weather: WeatherTelemetry = {
        temp,
        humidity,
        chanceOfRain,
        windSpeed,
        aqi,
        uvIndex,
      };

      // Set operational status by evaluating initial severity rules:
      // Operational Status weather severity mapping:
      // Category A (Severe Weather): Instantly triggers "Severe Disruption" status and sends automated dispatches.
      // - Temperature > 43°C (Extreme heatstroke hazard) OR
      // - PAK AQI > 300 (Hazardous Air Smog) OR
      // - Chance of Rain > 85% and Humidity > 85% (Torrential Flood Alert) OR
      // - UV Index > 11 AND Temp > 40°C
      // Category B (Moderate Weather / Heavy Rain): Triggers a "Caution" status and holds alert in review queue.
      // - Temp > 39°C OR
      // - PAK AQI > 175 OR
      // - Chance of Rain > 70%
      // Safe Weather: Displays as "Operational".
      let operationalStatus: 'Operational' | 'Caution' | 'Severe Disruption' = 'Operational';
      if (weather.temp > 43 || weather.aqi > 300 || (weather.chanceOfRain > 85 && weather.humidity > 85)) {
        operationalStatus = 'Severe Disruption';
      } else if (weather.temp > 39 || weather.aqi > 175 || weather.chanceOfRain > 70) {
        operationalStatus = 'Caution';
      }

      result.push({
        branchId,
        name,
        region: city.region,
        city: city.name,
        latitude: city.lat + latOffset,
        longitude: city.lng + lngOffset,
        active: true,
        weather,
        operationalStatus,
      });
    }
  });

  return result;
}

// Haversine formula to compute distance in KM between two geographic coordinates
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of Earth in KM
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
