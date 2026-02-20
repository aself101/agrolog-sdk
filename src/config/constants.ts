// ─── API Path Templates ──────────────────────────────────────────

export const API_PATHS = {
  LOGIN: '/api/auth/login',
  USER: '/api/auth/user',
  CUSTOMER: (customerId: string) => `/api/customer/${customerId}`,
  ASSETS: '/api/assets',
  DEVICES: '/api/devices',
  ASSET_TELEMETRY: (assetId: string, keys: string) =>
    `/api/plugins/telemetry/ASSET/${assetId}/values/timeseries?keys=${keys}`,
  DEVICE_TELEMETRY: (deviceId: string, keys: string) =>
    `/api/plugins/telemetry/DEVICE/${deviceId}/values/timeseries?keys=${keys}`,
  DEVICE_ATTRIBUTES: (deviceId: string, keys: string) =>
    `/api/plugins/telemetry/DEVICE/${deviceId}/values/attributes/CLIENT_SCOPE?keys=${keys}`,
  ALARMS: (entityId: string, limit: number) =>
    `/api/alarm/ASSET/${entityId}?searchStatus=ACTIVE&limit=${limit}`,
} as const;

// ─── Telemetry Key Strings ───────────────────────────────────────

export const TELEMETRY_KEYS = {
  SILO: [
    'current_min_temperature',
    'current_avg_temperature',
    'current_max_temperature',
    'current_min_delta_temperature',
    'current_avg_delta_temperature',
    'current_max_delta_temperature',
    'current_min_moisture',
    'current_avg_moisture',
    'current_max_moisture',
    'current_min_delta_moisture',
    'current_avg_delta_moisture',
    'current_max_delta_moisture',
  ].join(','),

  HEADSPACE: 'temperature,dewpoint,moisture,co2_level,pressure',

  SENSOR_LINE: [
    'temperature-1',
    'delta-temperature-1',
    'temperature-2',
    'delta-temperature-2',
    'temperature-3',
    'delta-temperature-3',
    'moisture-1',
    'delta-moisture-1',
    'moisture-2',
    'delta-moisture-2',
    'moisture-3',
    'delta-moisture-3',
  ].join(','),

  WEATHER: 'temperature,humidity',

  AERATION: 'state',

  SENSOR_COUNT: 'sensorCount,moistureSensors',
} as const;

// ─── Discovery Constants ─────────────────────────────────────────

export const DISCOVERY_ASSET_TYPES = {
  SITES: ['site'],
  SITE_ASSETS: ['silo', 'silo_group', 'weather_station', 'aeration'],
} as const;

export const DISCOVERY_DEVICE_TYPES = {
  SILO: ['temperature_sensor_lines', 'moisture_sensor_lines', 'level_indicator', 'head_space_sensor'],
  WEATHER_STATION: ['weather_station'],
} as const;

// ─── Timing ──────────────────────────────────────────────────────

export const DEFAULT_TIMEOUT = 30_000;
export const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes before expiry
export const BACKOFF_BASE_MS = 1_000;
export const MAX_RETRIES = 3;

// ─── Error Codes ─────────────────────────────────────────────────

export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  DISCOVERY_FAILED: 'DISCOVERY_FAILED',
  TELEMETRY_FAILED: 'TELEMETRY_FAILED',
  REQUEST_FAILED: 'REQUEST_FAILED',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// ─── Default Base URL ────────────────────────────────────────────

export const DEFAULT_BASE_URL = 'http://console.agrolog.io:8080';
