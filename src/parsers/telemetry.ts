import type { RawTelemetry, RawAlarmResponse } from '../types-internal.js';
import type {
  TimestampedValue,
  SiloTelemetry,
  SensorLineTelemetry,
  HeadspaceTelemetry,
  WeatherTelemetry,
  AerationState,
  Alarm,
} from '../types.js';

function extractNumeric(raw: RawTelemetry, key: string): TimestampedValue<number> {
  const entries = raw[key];
  if (!entries || entries.length === 0) {
    return { value: null, ts: null };
  }
  const entry = entries[0];
  const parsed = Number(entry.value);
  return {
    value: Number.isNaN(parsed) ? null : parsed,
    ts: entry.ts,
  };
}

function extractString(raw: RawTelemetry, key: string): TimestampedValue<string> {
  const entries = raw[key];
  if (!entries || entries.length === 0) {
    return { value: null, ts: null };
  }
  const entry = entries[0];
  return { value: entry.value, ts: entry.ts };
}

/**
 * Normalize raw telemetry keys — the ThingsBoard API sometimes returns keys
 * with extra whitespace (e.g., multi-line constant strings). Trim them.
 */
function normalizeRawKeys(raw: RawTelemetry): RawTelemetry {
  const normalized: Record<string, typeof raw[string]> = {};
  for (const key of Object.keys(raw)) {
    normalized[key.trim()] = raw[key];
  }
  return normalized;
}

export function parseSiloTelemetry(raw: RawTelemetry): SiloTelemetry {
  const data = normalizeRawKeys(raw);
  return {
    minTemperature: extractNumeric(data, 'current_min_temperature'),
    avgTemperature: extractNumeric(data, 'current_avg_temperature'),
    maxTemperature: extractNumeric(data, 'current_max_temperature'),
    minDeltaTemperature: extractNumeric(data, 'current_min_delta_temperature'),
    avgDeltaTemperature: extractNumeric(data, 'current_avg_delta_temperature'),
    maxDeltaTemperature: extractNumeric(data, 'current_max_delta_temperature'),
    minMoisture: extractNumeric(data, 'current_min_moisture'),
    avgMoisture: extractNumeric(data, 'current_avg_moisture'),
    maxMoisture: extractNumeric(data, 'current_max_moisture'),
    minDeltaMoisture: extractNumeric(data, 'current_min_delta_moisture'),
    avgDeltaMoisture: extractNumeric(data, 'current_avg_delta_moisture'),
    maxDeltaMoisture: extractNumeric(data, 'current_max_delta_moisture'),
  };
}

export function parseSensorLineTelemetry(raw: RawTelemetry): SensorLineTelemetry {
  const data = normalizeRawKeys(raw);
  return {
    sensor1Temperature: extractNumeric(data, 'temperature-1'),
    sensor1DeltaTemperature: extractNumeric(data, 'delta-temperature-1'),
    sensor2Temperature: extractNumeric(data, 'temperature-2'),
    sensor2DeltaTemperature: extractNumeric(data, 'delta-temperature-2'),
    sensor3Temperature: extractNumeric(data, 'temperature-3'),
    sensor3DeltaTemperature: extractNumeric(data, 'delta-temperature-3'),
    sensor1Moisture: extractNumeric(data, 'moisture-1'),
    sensor1DeltaMoisture: extractNumeric(data, 'delta-moisture-1'),
    sensor2Moisture: extractNumeric(data, 'moisture-2'),
    sensor2DeltaMoisture: extractNumeric(data, 'delta-moisture-2'),
    sensor3Moisture: extractNumeric(data, 'moisture-3'),
    sensor3DeltaMoisture: extractNumeric(data, 'delta-moisture-3'),
  };
}

export function parseHeadspaceTelemetry(raw: RawTelemetry): HeadspaceTelemetry {
  const data = normalizeRawKeys(raw);
  return {
    temperature: extractNumeric(data, 'temperature'),
    dewpoint: extractNumeric(data, 'dewpoint'),
    moisture: extractNumeric(data, 'moisture'),
    co2Level: extractNumeric(data, 'co2_level'),
    pressure: extractNumeric(data, 'pressure'),
  };
}

export function parseWeatherTelemetry(raw: RawTelemetry): WeatherTelemetry {
  const data = normalizeRawKeys(raw);
  return {
    temperature: extractNumeric(data, 'temperature'),
    humidity: extractNumeric(data, 'humidity'),
  };
}

export function parseAerationState(raw: RawTelemetry): AerationState {
  const data = normalizeRawKeys(raw);
  return {
    state: extractString(data, 'state'),
  };
}

export function parseAlarms(raw: RawAlarmResponse): Alarm[] {
  if (!raw || !raw.data) return [];

  return raw.data.map(alarm => ({
    alarmId: alarm.id.id,
    name: alarm.name,
    type: alarm.type,
    severity: alarm.severity,
    status: alarm.status,
    createdTime: alarm.createdTime,
    startTs: alarm.startTs,
    endTs: alarm.endTs,
    originatorId: alarm.originator.id,
    details: alarm.details,
  }));
}
