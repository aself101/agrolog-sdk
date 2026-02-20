import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { getAerationState } from '../../src/operations/aeration.js';
import { AgrologAPIError } from '../../src/errors.js';
import { makeAerationTelemetry, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getAerationState', () => {
  const client = createTestHttpClient();

  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches and parses aeration state', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/aer-1\/values\/timeseries/)
      .reply(200, makeAerationTelemetry());

    const result = await getAerationState(client, 'aer-1');
    expect(result.state.value).toBe('on');
  });

  it('propagates AgrologAPIError on server error', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/aer-1\/values\/timeseries/)
      .reply(500, { message: 'Internal server error' });

    await expect(getAerationState(client, 'aer-1')).rejects.toBeInstanceOf(AgrologAPIError);
  });
});
