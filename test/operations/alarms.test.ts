import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { AgrologHttpClient } from '../../src/http/http-client.js';
import { getAlarms } from '../../src/operations/alarms.js';
import { makeAlarmResponse } from '../test-setup.js';

const BASE_URL = 'http://localhost:8080';

describe('getAlarms', () => {
  let client: AgrologHttpClient;

  beforeAll(() => {
    nock.disableNetConnect();
    client = new AgrologHttpClient(BASE_URL, 5000);
    client.setAuth(async () => 'mock-token', async () => { /* no-op */ });
  });

  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches and parses alarms', async () => {
    nock(BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('High Temperature');
    expect(result[0].severity).toBe('CRITICAL');
  });

  it('supports custom limit', async () => {
    nock(BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=5/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', 5);
    expect(result).toHaveLength(1);
  });
});
