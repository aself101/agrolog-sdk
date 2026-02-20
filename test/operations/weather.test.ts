import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getWeatherTelemetry } from '../../src/operations/weather.js';
import { makeWeatherDevicesResponse, makeWeatherTelemetry } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getWeatherTelemetry', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('discovers weather device then fetches telemetry', async () => {
    nock(BASE_URL).post('/api/devices').reply(200, makeWeatherDevicesResponse());
    nock(BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/ws-device-1\/values\/timeseries/)
      .reply(200, makeWeatherTelemetry());

    const result = await getWeatherTelemetry(client, 'ws-1');

    expect(result.temperature.value).toBe(28.5);
    expect(result.humidity.value).toBe(75.0);
  });
});
