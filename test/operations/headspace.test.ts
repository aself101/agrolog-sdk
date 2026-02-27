import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { getHeadspaceTelemetry } from '../../src/operations/headspace.js';
import { makeSiloDevicesResponse, makeHeadspaceTelemetry, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getHeadspaceTelemetry', () => {
  const client = createTestHttpClient();

  it('discovers headspace device then fetches telemetry', async () => {
    // First call: discover silo devices
    nock(TEST_BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());
    // Second call: fetch headspace telemetry
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/headspace-1\/values\/timeseries/)
      .reply(200, makeHeadspaceTelemetry());

    const result = await getHeadspaceTelemetry(client, 'silo-1');

    expect(result.temperature.value).toBe(25.0);
    expect(result.co2Level.value).toBe(800);
    expect(result.pressure.value).toBe(101.3);
  });

  it('throws when no headspace sensor exists', async () => {
    nock(TEST_BASE_URL).post('/api/devices').reply(200, [
      { id: { id: 'temp-1', entityType: 'DEVICE' }, name: 'Temp', type: 'temperature_sensor_lines' },
    ]);

    await expect(getHeadspaceTelemetry(client, 'silo-1')).rejects.toThrow('No headspace sensor');
  });
});
