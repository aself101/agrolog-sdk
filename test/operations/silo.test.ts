import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getSiloTelemetry } from '../../src/operations/silo.js';
import { makeSiloTelemetry } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getSiloTelemetry', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches and parses silo telemetry', async () => {
    nock(BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/silo-1\/values\/timeseries/)
      .reply(200, makeSiloTelemetry());

    const result = await getSiloTelemetry(client, 'silo-1');

    expect(result.avgTemperature.value).toBe(20.3);
    expect(result.minMoisture.value).toBe(10.2);
    expect(result.maxDeltaMoisture.ts).toBe(1700000000000);
  });
});
