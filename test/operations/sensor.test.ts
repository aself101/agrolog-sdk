import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { getSensorLineTelemetry } from '../../src/operations/sensor.js';
import { AgrologAPIError } from '../../src/errors.js';
import { makeSensorLineTelemetry, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getSensorLineTelemetry', () => {
  const client = createTestHttpClient();

  it('fetches and parses sensor line telemetry', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/sensor-1\/values\/timeseries/)
      .reply(200, makeSensorLineTelemetry());

    const result = await getSensorLineTelemetry(client, 'sensor-1');

    expect(result.sensor1Temperature.value).toBe(21.0);
    expect(result.sensor2Moisture.value).toBe(11.5);
    expect(result.sensor3DeltaMoisture.value).toBe(0.3);
  });

  it('propagates AgrologAPIError on server error', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/DEVICE\/sensor-1\/values\/timeseries/)
      .reply(500, { message: 'Internal server error' });

    await expect(getSensorLineTelemetry(client, 'sensor-1')).rejects.toBeInstanceOf(AgrologAPIError);
  });
});
