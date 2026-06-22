export type RoleName = 'super_admin' | 'regional_admin' | 'school_head' | 'read_only';

export interface UserProfile {
  id: string; // unique identifier
  name: string;
  email: string;
  role: RoleName;
  region?: 'Centre' | 'South' | 'North'; // only for regional admin
  campusId?: string; // only for school head or read-only bound to campus
  avatarUrl?: string;
  points: number;
  badges: string[];
}

export type OperationalStatus = 'Operational' | 'Caution' | 'Severe Disruption';

export interface WeatherTelemetry {
  temp: number;         // °C
  humidity: number;     // %
  chanceOfRain: number; // %
  windSpeed: number;    // km/h
  uvIndex: number;
  cloudCover: number;   // % (from WeatherWalay)
  feelsLike: number;    // °C (from WeatherWalay)
  visibility: number;   // km (from WeatherWalay — low = fog/smog/haze)
  weatherCondition: string; // e.g. "Cloudy", "Heavy Rain" (from WeatherWalay)
}

export interface Campus {
  branchId: string;
  name: string;
  region: 'Centre' | 'South' | 'North';
  city: string;
  latitude: number;
  longitude: number;
  active: boolean;
  weather: WeatherTelemetry;
  operationalStatus: OperationalStatus;
  manualOverride?: boolean;
  overrideReason?: string;
  hazardEffectId?: string; // If affected by a disaster preset
}

export interface DisasterPreset {
  id: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radiusKm: number; // e.g. 12 KM
  hazardType: 'Smog' | 'Flash Flood' | 'Heatwave' | 'Extreme Rain';
  description: string;
  severity: 'Category A' | 'Category B';
}

export interface IncidentReport {
  id: string;
  campusId: string;
  campusName: string;
  reporterEmail: string;
  reporterName: string;
  hazardType: string;
  description: string;
  status: 'Pending' | 'Approved' | 'Dismissed';
  reportedWeather: Partial<WeatherTelemetry> & { description?: string };
  timestamp: string;
}

export interface SafetyAlert {
  id: string;
  campusId: string;
  campusName: string;
  region: 'Centre' | 'South' | 'North';
  status: 'Pending Review' | 'Broadcasted' | 'Dismissed';
  severity: 'A' | 'B'; // Category A: instant Severe; Category B: Caution (pending review queue)
  message: string;
  title: string;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    email: boolean;
  };
  generatedAnnouncement?: {
    subject: string;
    emailBody: string;
    smsVolume: string;
  };
  timestamp: string;
}

export interface MockNotification {
  id: string;
  type: 'sms' | 'whatsapp' | 'gsuite';
  sender: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
