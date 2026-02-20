import type { RawTelemetry, RawAlarmResponse, RawAsset, RawDevice } from '../src/types-internal.js';

// ─── Mock Telemetry Factories ────────────────────────────────────

export function makeSiloTelemetry(overrides: Partial<Record<string, [{ value: string; ts: number }]>> = {}): RawTelemetry {
  const ts = 1700000000000;
  const defaults: RawTelemetry = {
    'current_min_temperature': [{ value: '18.5', ts }],
    'current_avg_temperature': [{ value: '20.3', ts }],
    'current_max_temperature': [{ value: '22.1', ts }],
    'current_min_delta_temperature': [{ value: '0.1', ts }],
    'current_avg_delta_temperature': [{ value: '0.3', ts }],
    'current_max_delta_temperature': [{ value: '0.5', ts }],
    'current_min_moisture': [{ value: '10.2', ts }],
    'current_avg_moisture': [{ value: '11.5', ts }],
    'current_max_moisture': [{ value: '12.8', ts }],
    'current_min_delta_moisture': [{ value: '0.05', ts }],
    'current_avg_delta_moisture': [{ value: '0.1', ts }],
    'current_max_delta_moisture': [{ value: '0.15', ts }],
  };
  return { ...defaults, ...overrides };
}

export function makeSensorLineTelemetry(): RawTelemetry {
  const ts = 1700000000000;
  return {
    'temperature-1': [{ value: '21.0', ts }],
    'delta-temperature-1': [{ value: '0.2', ts }],
    'temperature-2': [{ value: '21.5', ts }],
    'delta-temperature-2': [{ value: '0.3', ts }],
    'temperature-3': [{ value: '22.0', ts }],
    'delta-temperature-3': [{ value: '0.4', ts }],
    'moisture-1': [{ value: '11.0', ts }],
    'delta-moisture-1': [{ value: '0.1', ts }],
    'moisture-2': [{ value: '11.5', ts }],
    'delta-moisture-2': [{ value: '0.2', ts }],
    'moisture-3': [{ value: '12.0', ts }],
    'delta-moisture-3': [{ value: '0.3', ts }],
  };
}

export function makeHeadspaceTelemetry(): RawTelemetry {
  const ts = 1700000000000;
  return {
    'temperature': [{ value: '25.0', ts }],
    'dewpoint': [{ value: '15.0', ts }],
    'moisture': [{ value: '60.0', ts }],
    'co2_level': [{ value: '800', ts }],
    'pressure': [{ value: '101.3', ts }],
  };
}

export function makeWeatherTelemetry(): RawTelemetry {
  const ts = 1700000000000;
  return {
    'temperature': [{ value: '28.5', ts }],
    'humidity': [{ value: '75.0', ts }],
  };
}

export function makeAerationTelemetry(): RawTelemetry {
  const ts = 1700000000000;
  return {
    'state': [{ value: 'on', ts }],
  };
}

export function makeAlarmResponse(): RawAlarmResponse {
  return {
    data: [
      {
        id: { id: 'alarm-1', entityType: 'ALARM' },
        name: 'High Temperature',
        type: 'HIGH_TEMP',
        severity: 'CRITICAL',
        status: 'ACTIVE_UNACK',
        createdTime: 1700000000000,
        startTs: 1700000000000,
        endTs: 0,
        originator: { id: 'silo-1', entityType: 'ASSET' },
        details: { silo: 'Silo 1', message: 'Temperature exceeded threshold' },
      },
    ],
    totalPages: 1,
    totalElements: 1,
    hasNext: false,
  };
}

// ─── Mock Asset/Device Factories ─────────────────────────────────

export function makeRawAssets(): RawAsset[] {
  return [
    { id: { id: 'silo-1', entityType: 'ASSET' }, name: 'Silo 1', type: 'silo' },
    { id: { id: 'silo-2', entityType: 'ASSET' }, name: 'Silo 2', type: 'silo' },
    { id: { id: 'ws-1', entityType: 'ASSET' }, name: 'Weather Station', type: 'weather_station' },
    { id: { id: 'aer-1', entityType: 'ASSET' }, name: 'Aerator 1', type: 'aeration' },
  ];
}

export function makeSiloDevicesResponse(): RawDevice[] {
  return [
    { id: { id: 'temp-sensor-1', entityType: 'DEVICE' }, name: 'Temp Sensor Line 1', type: 'temperature_sensor_lines' },
    { id: { id: 'moisture-sensor-1', entityType: 'DEVICE' }, name: 'Moisture Sensor Line 1', type: 'moisture_sensor_lines' },
    { id: { id: 'headspace-1', entityType: 'DEVICE' }, name: 'Headspace Sensor', type: 'head_space_sensor' },
    { id: { id: 'level-1', entityType: 'DEVICE' }, name: 'Level Indicator', type: 'level_indicator' },
  ];
}

export function makeWeatherDevicesResponse(): RawDevice[] {
  return [
    { id: { id: 'ws-device-1', entityType: 'DEVICE' }, name: 'Weather Device', type: 'weather_station' },
  ];
}

// ─── Env helpers ─────────────────────────────────────────────────

export function setTestEnv(): void {
  process.env.AGROLOG_USERNAME = 'test@example.com';
  process.env.AGROLOG_PASSWORD = 'test-password';
  process.env.AGROLOG_THINGSBOARD_URL = 'http://localhost:8080';
}

export function clearTestEnv(): void {
  delete process.env.AGROLOG_USERNAME;
  delete process.env.AGROLOG_PASSWORD;
  delete process.env.AGROLOG_THINGSBOARD_URL;
}
