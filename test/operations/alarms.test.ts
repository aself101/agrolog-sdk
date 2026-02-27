import { describe, it, expect } from 'vitest';
import nock from 'nock';
import { getAlarms } from '../../src/operations/alarms.js';
import { AgrologAPIError } from '../../src/errors.js';
import { makeAlarmResponse, createTestHttpClient, TEST_BASE_URL } from '../test-setup.js';

describe('getAlarms', () => {
  const client = createTestHttpClient();

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
    expect(result[0].alarmId).toBe('alarm-1');
  });

  it('clamps limit to minimum of 1', async () => {
    // limit=0 is clamped to 1 by Math.max(1, ...)
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=1/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', 0);
    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe('CRITICAL');
  });

  it('clamps limit to maximum of 1000', async () => {
    // limit=9999 is clamped to 1000 by Math.min(..., 1000)
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=1000/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', 9999);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('High Temperature');
  });

  it('floors fractional limit', async () => {
    // limit=5.9 is floored to 5 by Math.floor()
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=5/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', 5.9);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('HIGH_TEMP');
  });

  it('clamps negative limit to 1', async () => {
    // limit=-5 is clamped to 1 by Math.max(1, ...)
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=1/)
      .reply(200, makeAlarmResponse());

    const result = await getAlarms(client, 'silo-1', -5);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('ACTIVE_UNACK');
  });

  it('propagates AgrologAPIError on server error', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=10/)
      .reply(500, { message: 'Internal server error' });

    await expect(getAlarms(client, 'silo-1')).rejects.toBeInstanceOf(AgrologAPIError);
  });

  it('returns empty array when no alarms present', async () => {
    nock(TEST_BASE_URL)
      .get(/\/api\/alarm\/ASSET\/silo-1\?searchStatus=ACTIVE&limit=10/)
      .reply(200, { data: [], totalPages: 0, totalElements: 0, hasNext: false });

    const result = await getAlarms(client, 'silo-1');
    expect(result).toHaveLength(0);
  });
});
