import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getHeadspaceTelemetry } from '../../src/operations/headspace.js';
import { makeSiloDevicesResponse, makeHeadspaceTelemetry } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getHeadspaceTelemetry', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('discovers headspace device then fetches telemetry', async () => {
    // First call: discover silo devices
    nock(BASE_URL).post('/api/devices').reply(200, makeSiloDevicesResponse());
    // Second call: fetch headspace telemetry
    nock(BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/headspace-1\/values\/timeseries/)
      .reply(200, makeHeadspaceTelemetry());

    const result = await getHeadspaceTelemetry(client, 'silo-1');

    expect(result.temperature.value).toBe(25.0);
    expect(result.co2Level.value).toBe(800);
    expect(result.pressure.value).toBe(101.3);
  });

  it('throws when no headspace sensor exists', async () => {
    nock(BASE_URL).post('/api/devices').reply(200, [
      { id: { id: 'temp-1', entityType: 'DEVICE' }, name: 'Temp', type: 'temperature_sensor_lines' },
    ]);

    await expect(getHeadspaceTelemetry(client, 'silo-1')).rejects.toThrow('No headspace sensor');
  });
});
