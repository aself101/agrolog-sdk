// ─── Entity ID Validation ────────────────────────────────────────

import { AgrologAPIError } from '../errors.js';

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;
const SAFE_KEYS_PATTERN = /^[a-zA-Z0-9_,-]+$/;

/** Validates that an entity ID is safe for URL path interpolation. */
export function validateId(id: string): string {
  if (!SAFE_ID_PATTERN.test(id)) {
    throw new AgrologAPIError(
      `Invalid entity ID format: "${id}". Expected alphanumeric, hyphens, or underscores.`,
      'REQUEST_FAILED',
    );
  }
  return id;
}

/** Validates that telemetry key strings are safe for URL query interpolation. */
function validateKeys(keys: string): string {
  if (!SAFE_KEYS_PATTERN.test(keys)) {
    throw new AgrologAPIError(
      `Invalid telemetry keys format: "${keys}". Expected comma-separated alphanumeric keys.`,
      'REQUEST_FAILED',
    );
  }
  return keys;
}

// ─── API Path Templates ──────────────────────────────────────────

export const API_PATHS = {
  LOGIN: '/api/auth/login',
  USER: '/api/auth/user',
  CUSTOMER: (customerId: string) => `/api/customer/${validateId(customerId)}`,
  ASSETS: '/api/assets',
  DEVICES: '/api/devices',
  ASSET_TELEMETRY: (assetId: string, keys: string) =>
    `/api/plugins/telemetry/ASSET/${validateId(assetId)}/values/timeseries?keys=${validateKeys(keys)}`,
  DEVICE_TELEMETRY: (deviceId: string, keys: string) =>
    `/api/plugins/telemetry/DEVICE/${validateId(deviceId)}/values/timeseries?keys=${validateKeys(keys)}`,
  ALARMS: (entityId: string, limit: number) =>
    `/api/alarm/ASSET/${validateId(entityId)}?searchStatus=ACTIVE&limit=${limit}`,
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

/** Default HTTP request timeout in milliseconds (30 seconds). */
export const DEFAULT_TIMEOUT = 30_000;
export const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
export const TOKEN_REFRESH_BUFFER_MS = 2 * 60 * 1000; // 2 minutes before expiry
export const BACKOFF_BASE_MS = 1_000;
export const MAX_RETRIES = 3;

// ─── Error Codes ─────────────────────────────────────────────────

export const ERROR_CODES = {
  AUTH_FAILED: 'AUTH_FAILED',
  /** Reserved for future use — kept for consumers who check against this code. */
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  NOT_CONNECTED: 'NOT_CONNECTED',
  DISCOVERY_FAILED: 'DISCOVERY_FAILED',
  /** Reserved for future use — kept for consumers who check against this code. */
  TELEMETRY_FAILED: 'TELEMETRY_FAILED',
  REQUEST_FAILED: 'REQUEST_FAILED',
  TIMEOUT: 'TIMEOUT',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

// ─── Default Base URL ────────────────────────────────────────────

/**
 * Default ThingsBoard URL. Uses HTTPS for secure credential transmission.
 * Override with `baseUrl` config or `AGROLOG_THINGSBOARD_URL` env var if
 * your ThingsBoard instance uses plain HTTP.
 */
export const DEFAULT_BASE_URL = 'https://console.agrolog.io';
