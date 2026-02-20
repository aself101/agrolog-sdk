import { describe, it, expect } from 'vitest';
import {
  parseSiloTelemetry,
  parseSensorLineTelemetry,
  parseHeadspaceTelemetry,
  parseWeatherTelemetry,
  parseAerationState,
  parseAlarms,
} from '../../src/parsers/telemetry.js';
import {
  makeSiloTelemetry,
  makeSensorLineTelemetry,
  makeHeadspaceTelemetry,
  makeWeatherTelemetry,
  makeAerationTelemetry,
  makeAlarmResponse,
} from '../test-setup.js';

describe('parseSiloTelemetry', () => {
  it('parses all 12 silo fields', () => {
    const result = parseSiloTelemetry(makeSiloTelemetry());

    expect(result.minTemperature).toEqual({ value: 18.5, ts: 1700000000000 });
    expect(result.avgTemperature).toEqual({ value: 20.3, ts: 1700000000000 });
    expect(result.maxTemperature).toEqual({ value: 22.1, ts: 1700000000000 });
    expect(result.minDeltaTemperature).toEqual({ value: 0.1, ts: 1700000000000 });
    expect(result.avgDeltaTemperature).toEqual({ value: 0.3, ts: 1700000000000 });
    expect(result.maxDeltaTemperature).toEqual({ value: 0.5, ts: 1700000000000 });
    expect(result.minMoisture).toEqual({ value: 10.2, ts: 1700000000000 });
    expect(result.avgMoisture).toEqual({ value: 11.5, ts: 1700000000000 });
    expect(result.maxMoisture).toEqual({ value: 12.8, ts: 1700000000000 });
    expect(result.minDeltaMoisture).toEqual({ value: 0.05, ts: 1700000000000 });
    expect(result.avgDeltaMoisture).toEqual({ value: 0.1, ts: 1700000000000 });
    expect(result.maxDeltaMoisture).toEqual({ value: 0.15, ts: 1700000000000 });
  });

  it('returns null values for missing keys', () => {
    const result = parseSiloTelemetry({});

    expect(result.minTemperature).toEqual({ value: null, ts: null });
    expect(result.avgMoisture).toEqual({ value: null, ts: null });
  });

  it('handles whitespace in keys', () => {
    const raw = {
      '  current_min_temperature  ': [{ value: '18.5', ts: 1700000000000 }],
    };
    const result = parseSiloTelemetry(raw);
    expect(result.minTemperature).toEqual({ value: 18.5, ts: 1700000000000 });
  });

  it('returns null for non-numeric values', () => {
    const raw = {
      'current_min_temperature': [{ value: 'not-a-number', ts: 1700000000000 }],
    };
    const result = parseSiloTelemetry(raw);
    expect(result.minTemperature).toEqual({ value: null, ts: 1700000000000 });
  });
});

describe('parseSensorLineTelemetry', () => {
  it('parses all 12 sensor line fields', () => {
    const result = parseSensorLineTelemetry(makeSensorLineTelemetry());

    expect(result.sensor1Temperature).toEqual({ value: 21.0, ts: 1700000000000 });
    expect(result.sensor2Temperature).toEqual({ value: 21.5, ts: 1700000000000 });
    expect(result.sensor3Temperature).toEqual({ value: 22.0, ts: 1700000000000 });
    expect(result.sensor1Moisture).toEqual({ value: 11.0, ts: 1700000000000 });
    expect(result.sensor2Moisture).toEqual({ value: 11.5, ts: 1700000000000 });
    expect(result.sensor3Moisture).toEqual({ value: 12.0, ts: 1700000000000 });
  });

  it('returns null when sensor3 data is missing (no computation)', () => {
    const raw = makeSensorLineTelemetry();
    delete (raw as Record<string, unknown>)['temperature-3'];
    const result = parseSensorLineTelemetry(raw);
    expect(result.sensor3Temperature).toEqual({ value: null, ts: null });
  });
});

describe('parseHeadspaceTelemetry', () => {
  it('parses all 5 headspace fields', () => {
    const result = parseHeadspaceTelemetry(makeHeadspaceTelemetry());

    expect(result.temperature).toEqual({ value: 25.0, ts: 1700000000000 });
    expect(result.dewpoint).toEqual({ value: 15.0, ts: 1700000000000 });
    expect(result.moisture).toEqual({ value: 60.0, ts: 1700000000000 });
    expect(result.co2Level).toEqual({ value: 800, ts: 1700000000000 });
    expect(result.pressure).toEqual({ value: 101.3, ts: 1700000000000 });
  });
});

describe('parseWeatherTelemetry', () => {
  it('parses temperature and humidity', () => {
    const result = parseWeatherTelemetry(makeWeatherTelemetry());

    expect(result.temperature).toEqual({ value: 28.5, ts: 1700000000000 });
    expect(result.humidity).toEqual({ value: 75.0, ts: 1700000000000 });
  });
});

describe('parseAerationState', () => {
  it('parses state as string value', () => {
    const result = parseAerationState(makeAerationTelemetry());
    expect(result.state).toEqual({ value: 'on', ts: 1700000000000 });
  });

  it('returns null for missing state', () => {
    const result = parseAerationState({});
    expect(result.state).toEqual({ value: null, ts: null });
  });
});

describe('parseAlarms', () => {
  it('parses alarm response', () => {
    const result = parseAlarms(makeAlarmResponse());

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      alarmId: 'alarm-1',
      name: 'High Temperature',
      type: 'HIGH_TEMP',
      severity: 'CRITICAL',
      status: 'ACTIVE_UNACK',
      createdTime: 1700000000000,
      startTs: 1700000000000,
      endTs: 0,
      originatorId: 'silo-1',
      details: { silo: 'Silo 1', message: 'Temperature exceeded threshold' },
    });
  });

  it('returns empty array for null response', () => {
    expect(parseAlarms(null as unknown as never)).toEqual([]);
  });

  it('returns empty array for empty data', () => {
    expect(parseAlarms({ data: [], totalPages: 0, totalElements: 0, hasNext: false })).toEqual([]);
  });
});
