import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologClient } from '../src/client.js';
import { AgrologAPIError } from '../src/errors.js';
import {
  makeSiloTelemetry,
  makeSensorLineTelemetry,
  makeHeadspaceTelemetry,
  makeAerationTelemetry,
  makeAlarmResponse,
  makeRawAssets,
  makeSiloDevicesResponse,
  makeWeatherDevicesResponse,
  makeWeatherTelemetry,
} from './test-setup.js';

const BASE_URL = 'http://localhost:8080';

function setupConnectMocks() {
  // Login
  nock(BASE_URL).post('/api/auth/login').reply(200, { token: 'jwt-token', refreshToken: 'r' });
  // User
  nock(BASE_URL).get('/api/auth/user').reply(200, {
    customerId: { id: 'cust-1', entityType: 'CUSTOMER' },
  });
  // Sites
  nock(BASE_URL).post('/api/assets').reply(200, [
    { id: { id: 'site-1', entityType: 'ASSET' }, name: 'Hawaii Site', type: 'site' },
  ]);
  // Site assets
  nock(BASE_URL).post('/api/assets').reply(200, makeRawAssets());
}

describe('AgrologClient', () => {
  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('throws if no credentials provided', () => {
    // Pass explicit empty strings to bypass any env/dotenv fallback
    expect(() => new AgrologClient({ username: '', password: '' })).toThrow('username is required');
  });

  describe('with credentials', () => {
    let client: AgrologClient;

    beforeAll(() => {
      client = new AgrologClient({
        username: 'test@example.com',
        password: 'password',
        baseUrl: BASE_URL,
      });
    });

    it('throws NOT_CONNECTED before connect()', async () => {
      await expect(client.getSiloTelemetry('silo-1')).rejects.toThrow('not connected');
    });

    it('isConnected() returns false before connect', () => {
      expect(client.isConnected()).toBe(false);
    });
  });

  describe('connected client', () => {
    let client: AgrologClient;

    beforeAll(async () => {
      client = new AgrologClient({
        username: 'test@example.com',
        password: 'password',
        baseUrl: BASE_URL,
      });
      setupConnectMocks();
      await client.connect();
    });

    it('isConnected() returns true after connect', () => {
      expect(client.isConnected()).toBe(true);
    });

    it('getTopology() returns discovered topology', () => {
      const topology = client.getTopology();
      expect(topology.customerId).toBe('cust-1');
      expect(topology.silos).toHaveLength(2);
      expect(topology.weatherStation?.name).toBe('Weather Station');
    });

    it('getSiloTelemetry fetches telemetry', async () => {
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/ASSET\/silo-1\/values\/timeseries/)
        .reply(200, makeSiloTelemetry());

      const result = await client.getSiloTelemetry('silo-1');
      expect(result.avgTemperature.value).toBe(20.3);
    });

    it('getAllSiloTelemetry fetches all silos in parallel', async () => {
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/ASSET\/silo-1\/values\/timeseries/)
        .reply(200, makeSiloTelemetry());
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/ASSET\/silo-2\/values\/timeseries/)
        .reply(200, makeSiloTelemetry());

      const results = await client.getAllSiloTelemetry();
      expect(results.size).toBe(2);
      expect(results.get('silo-1')?.avgTemperature.value).toBe(20.3);
    });

    it('getSiloDevices returns devices', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());

      const result = await client.getSiloDevices('silo-1');
      expect(result.devices).toHaveLength(4);
    });

    it('getWeatherTelemetry uses topology weather station by default', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, makeWeatherDevicesResponse());
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/DEVICE\/ws-device-1\/values\/timeseries/)
        .reply(200, makeWeatherTelemetry());

      const result = await client.getWeatherTelemetry();
      expect(result.temperature.value).toBe(28.5);
    });

    it('getSensorLineTelemetry fetches sensor data', async () => {
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/DEVICE\/sensor-1\/values\/timeseries/)
        .reply(200, makeSensorLineTelemetry());

      const result = await client.getSensorLineTelemetry('sensor-1');
      expect(result.sensor1Temperature.value).toBe(21.0);
      expect(result.sensor3Temperature.value).toBe(22.0);
    });

    it('getHeadspaceTelemetry discovers device then fetches', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/DEVICE\/headspace-1\/values\/timeseries/)
        .reply(200, makeHeadspaceTelemetry());

      const result = await client.getHeadspaceTelemetry('silo-1');
      expect(result.temperature.value).toBe(25.0);
      expect(result.co2Level.value).toBe(800);
    });

    it('getAerationState fetches aeration data', async () => {
      nock(BASE_URL)
        .get(/\/api\/plugins\/telemetry\/ASSET\/aer-1\/values\/timeseries/)
        .reply(200, makeAerationTelemetry());

      const result = await client.getAerationState('aer-1');
      expect(result.state.value).toBe('on');
    });

    it('getAlarms fetches alarm list', async () => {
      nock(BASE_URL)
        .get(/\/api\/alarm\/ASSET\/silo-1/)
        .reply(200, makeAlarmResponse());

      const result = await client.getAlarms('silo-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('High Temperature');
      expect(result[0].severity).toBe('CRITICAL');
    });

    it('refreshAuth clears and re-acquires token', async () => {
      // Mock the login endpoint for token refresh
      nock(BASE_URL)
        .post('/api/auth/login')
        .reply(200, { token: 'new-jwt-token', refreshToken: 'new-r' });

      // Should not throw
      await client.refreshAuth();
    });
  });
});
