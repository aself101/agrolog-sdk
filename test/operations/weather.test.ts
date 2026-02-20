import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { getWeatherTelemetry } from '../../src/operations/weather.js';
import { makeWeatherDevicesResponse, makeWeatherTelemetry, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getWeatherTelemetry', () => {
  const client = createTestHttpClient();

  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('throws AgrologAPIError when weather device discovery fails', async () => {
    nock(TEST_BASE_URL).post('/api/devices').reply(200, []);

    await expect(getWeatherTelemetry(client, 'ws-1')).rejects.toThrow('No weather');
  });

  it('discovers weather device then fetches telemetry', async () => {
    nock(TEST_BASE_URL).post('/api/devices').reply(200, makeWeatherDevicesResponse());
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/ws-device-1\/values\/timeseries/)
      .reply(200, makeWeatherTelemetry());

    const result = await getWeatherTelemetry(client, 'ws-1');

    expect(result.temperature.value).toBe(28.5);
    expect(result.humidity.value).toBe(75.0);
  });
});
