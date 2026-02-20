import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import nock from 'nock';
import { getAlarms } from '../../src/operations/alarms.js';
import { makeAlarmResponse, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getAlarms', () => {
  const client = createTestHttpClient();

  beforeAll(() => nock.disableNetConnect());
  afterAll(() => nock.enableNetConnect());
  afterEach(() => nock.cleanAll());

  it('fetches alarms with default limit of 10', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=10/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('High Temperature');
    expect(result[0].severity).toBe('CRITICAL');
  });

  it('supports custom limit', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=5/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', 5);
    expect(result).toHaveLength(1);
  });
});
