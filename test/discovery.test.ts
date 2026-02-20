import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../src/http/http-client.js';
import { discoverTopology, discoverSiloDevices, discoverWeatherDevice } from '../src/discovery/discovery.js';
import { makeRawAssets, makeSiloDevicesResponse, makeWeatherDevicesResponse } from './test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('discovery', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('discoverTopology', () => {
    it('discovers customer, site, and all assets', async () => {
      // Step 1: user
      nock(BASE_URL).get('/api/auth/user').reply(200, {
        customerId: { id: 'cust-123', entityType: 'CUSTOMER' },
      });

      // Step 2: sites
      nock(BASE_URL).post('/api/assets').reply(200, [
        { id: { id: 'site-1', entityType: 'ASSET' }, name: 'Hawaii Site', type: 'site' },
      ]);

      // Step 3: site assets
      nock(BASE_URL).post('/api/assets').reply(200, makeRawAssets());

      const topology = await discoverTopology(client);

      expect(topology.customerId).toBe('cust-123');
      expect(topology.siteId).toBe('site-1');
      expect(topology.silos).toHaveLength(2);
      expect(topology.silos[0].name).toBe('Silo 1');
      expect(topology.weatherStation?.name).toBe('Weather Station');
      expect(topology.aerators).toHaveLength(1);
    });

    it('throws when no sites found', async () => {
      nock(BASE_URL).get('/api/auth/user').reply(200, {
        customerId: { id: 'cust-123', entityType: 'CUSTOMER' },
      });
      nock(BASE_URL).post('/api/assets').reply(200, []);

      await expect(discoverTopology(client)).rejects.toThrow('No sites found');
    });
  });

  describe('discoverSiloDevices', () => {
    it('discovers devices within a silo', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());

      const result = await discoverSiloDevices(client, 'silo-1');

      expect(result.siloId).toBe('silo-1');
      expect(result.devices).toHaveLength(4);
      expect(result.devices.find(d => d.type === 'head_space_sensor')?.deviceId).toBe('headspace-1');
    });
  });

  describe('discoverWeatherDevice', () => {
    it('discovers weather station device', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, makeWeatherDevicesResponse());

      const deviceId = await discoverWeatherDevice(client, 'ws-1');
      expect(deviceId).toBe('ws-device-1');
    });

    it('throws when no weather device found', async () => {
      nock(BASE_URL).post('/api/devices').reply(200, []);

      await expect(discoverWeatherDevice(client, 'ws-1')).rejects.toThrow('No weather station device');
    });
  });
});
