import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { getSiloTelemetry } from '../../src/operations/silo.js';
import { AgrologAPIError } from '../../src/errors.js';
import { makeSiloTelemetry, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getSiloTelemetry', () => {
  const client = createTestHttpClient();

  it('fetches and parses silo telemetry', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/silo-1\/values\/timeseries/)
      .reply(200, makeSiloTelemetry());

    const result = await getSiloTelemetry(client, 'silo-1');

    expect(result.avgTemperature.value).toBe(20.3);
    expect(result.minMoisture.value).toBe(10.2);
  });

  it('propagates AgrologAPIError on server error', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/silo-1\/values\/timeseries/)
      .reply(500, { message: 'Internal server error' });

    await expect(getSiloTelemetry(client, 'silo-1')).rejects.toBeInstanceOf(AgrologAPIError);
  });
});
