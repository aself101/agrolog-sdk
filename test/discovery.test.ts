import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { discoverTopology, discoverSiloDevices, discoverWeatherDevice } from '../src/discovery/discovery.js';
import { AgrologAPIError } from '../src/errors.js';
import { makeRawAssets, makeSiloDevicesResponse, makeWeatherDevicesResponse, createTestHttpClient, TEST_BASE_URL } from './test-setup.js';

describe('discovery', () => {
  const client = createTestHttpClient();

  describe('discoverTopology', () => {
    it('discovers customer, site, and all assets', async () => {
      // Step 1: user
      nock(TEST_BASE_URL).get('/api/auth/user').reply(200, {
        customerId: { id: 'cust-123', entityType: 'CUSTOMER' },
      });

      // Step 2: sites
      nock(TEST_BASE_URL).post('/api/assets').reply(200, [
        { id: { id: 'site-1', entityType: 'ASSET' }, name: 'Hawaii Site', type: 'site' },
      ]);

      // Step 3: site assets
      nock(TEST_BASE_URL).post('/api/assets').reply(200, makeRawAssets());

      const topology = await discoverTopology(client);

      expect(topology.customerId).toBe('cust-123');
      expect(topology.siteId).toBe('site-1');
      expect(topology.silos).toHaveLength(2);
      expect(topology.silos[0].name).toBe('Silo 1');
      expect(topology.weatherStation?.name).toBe('Weather Station');
      expect(topology.aerators).toHaveLength(1);
    });

    it('throws when no sites found', async () => {
      nock(TEST_BASE_URL).get('/api/auth/user').reply(200, {
        customerId: { id: 'cust-123', entityType: 'CUSTOMER' },
      });
      nock(TEST_BASE_URL).post('/api/assets').reply(200, []);

      await expect(discoverTopology(client)).rejects.toThrow('No sites found');
    });

    it('propagates error when user endpoint fails', async () => {
      nock(TEST_BASE_URL).get('/api/auth/user').reply(500, { message: 'Internal server error' });

      await expect(discoverTopology(client)).rejects.toBeInstanceOf(AgrologAPIError);
    });
  });

  describe('discoverSiloDevices', () => {
    it('discovers devices within a silo', async () => {
      nock(TEST_BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());

      const result = await discoverSiloDevices(client, 'silo-1');

      expect(result.siloId).toBe('silo-1');
      expect(result.devices).toHaveLength(4);
      expect(result.devices.find(d => d.type === 'head_space_sensor')?.deviceId).toBe('headspace-1');
    });
  });

  describe('discoverWeatherDevice', () => {
    it('discovers weather station device', async () => {
      nock(TEST_BASE_URL).post('/api/devices').reply(200, makeWeatherDevicesResponse());

      const deviceId = await discoverWeatherDevice(client, 'ws-1');
      expect(deviceId).toBe('ws-device-1');
    });

    it('throws when no weather device found', async () => {
      nock(TEST_BASE_URL).post('/api/devices').reply(200, []);

      await expect(discoverWeatherDevice(client, 'ws-1')).rejects.toThrow('No weather station device');
    });
  });
});
