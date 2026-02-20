import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS } from '../config/constants.js';
import { parseAlarms } from '../parsers/telemetry.js';
import type { RawAlarmResponse } from '../types-internal.js';
import type { Alarm } from '../types.js';

const DEFAULT_ALARM_LIMIT = 10;

export async function getAlarms(
  client: AgrologHttpClient,
  entityId: string,
  limit = DEFAULT_ALARM_LIMIT,
): Promise<Alarm[]> {
  const raw = await client.request<RawAlarmResponse>(
    'GET',
    API_PATHS.ALARMS(entityId, limit),
  );
  return parseAlarms(raw);
}
