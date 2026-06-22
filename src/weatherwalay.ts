/**
 * WeatherWalay V2 API Integration
 * POST https://services.weatherwalay.com/v2/weather/byLatLong
 * Auth: Basic base64(username:secret)
 */

import { WeatherTelemetry } from './types.js';

const BASE_URL = 'https://services.weatherwalay.com/v2/weather/byLatLong';

function buildAuthHeader(): string {
  const username = process.env.WEATHERWALAY_USERNAME;
  const secret = process.env.WEATHERWALAY_SECRET;
  if (!username || !secret) throw new Error('WeatherWalay credentials not set in environment.');
  const encoded = Buffer.from(`${username}:${secret}`).toString('base64');
  return `Basic ${encoded}`;
}

export interface WeatherWalayNowcast {
  temp: number;
  hum: number;
  windSpeed: number;
  windDir: number;
  windDirectionCardinal: string;
  windGust: number;
  heatIndex: number;
  feelsLike: number;
  visibility: number;
  pressure: number;
  dew: number;
  rainfall: number;
  expectedRainfall: number;
  rainIntensity: number;
  precType: string;
  prec: string;       // percent string e.g. "30%"
  cloudCover: number;
  uv: number;
  dayOrNight: string;
  weatherConditionEnglish: string;
  weatherConditionUrdu: string;
  weatherConditionCategory: string;
  weatherPictocode: number;
  sunrise: string;
  sunset: string;
  time: string;
  date: string;
}

export interface WeatherWalayResponse {
  success: boolean;
  msg: string;
  record?: {
    lat: number;
    long: number;
    timestamp: string;
    nowcast: WeatherWalayNowcast;
    hourly: any[];
    daily: any[];
  };
}

/**
 * Fetch current weather for a lat/lng from WeatherWalay API.
 * Maps their nowcast fields to our WeatherTelemetry interface.
 */
export async function fetchWeatherWalay(lat: number, lng: number): Promise<WeatherTelemetry> {
  const auth = buildAuthHeader();

  const body = new URLSearchParams();
  body.append('lat', String(lat));
  body.append('long', String(lng));

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': auth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`WeatherWalay HTTP error: ${response.status}`);
  }

  const data: WeatherWalayResponse = await response.json();

  if (!data.success || !data.record?.nowcast) {
    throw new Error(`WeatherWalay API error: ${data.msg}`);
  }

  const n = data.record.nowcast;

  // Parse precipitation chance — comes as string like "30%" or a number
  let chanceOfRain = 0;
  if (typeof n.prec === 'string') {
    chanceOfRain = parseInt(n.prec.replace('%', ''), 10) || 0;
  } else if (typeof n.prec === 'number') {
    chanceOfRain = n.prec;
  }
  // Also factor in rainIntensity as a secondary signal
  if (n.rainIntensity > 0 && chanceOfRain === 0) {
    chanceOfRain = Math.min(100, Math.round(n.rainIntensity * 10));
  }

  return {
    temp: n.temp ?? 30,
    humidity: n.hum ?? 50,
    chanceOfRain,
    windSpeed: n.windSpeed ?? 10,
    uvIndex: n.uv ?? 5,
    cloudCover: n.cloudCover ?? 30,
    feelsLike: n.feelsLike ?? n.temp ?? 30,
    visibility: n.visibility ?? 10,
    weatherCondition: n.weatherConditionEnglish ?? 'Clear',
  };
}
