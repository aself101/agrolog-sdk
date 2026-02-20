import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getSensorLineTelemetry } from '../../src/operations/sensor.js';
import { makeSensorLineTelemetry } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getSensorLineTelemetry', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches and parses sensor line telemetry', async () => {
    nock(BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/sensor-1\/values\/timeseries/)
      .reply(200, makeSensorLineTelemetry());

    const result = await getSensorLineTelemetry(client, 'sensor-1');

    expect(result.sensor1Temperature.value).toBe(21.0);
    expect(result.sensor2Moisture.value).toBe(11.5);
    expect(result.sensor3DeltaMoisture.value).toBe(0.3);
  });
});
