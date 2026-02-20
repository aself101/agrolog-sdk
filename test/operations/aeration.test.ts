import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getAerationState } from '../../src/operations/aeration.js';
import { makeAerationTelemetry } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getAerationState', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches and parses aeration state', async () => {
    nock(BASE_URL)
      .get(/\/api\/plugins\/telemetry\/ASSET\/aer-1\/values\/timeseries/)
      .reply(200, makeAerationTelemetry());

    const result = await getAerationState(client, 'aer-1');
    expect(result.state.value).toBe('on');
  });
});
