import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, TELEMETRY_KEYS } from '../config/constants.js';
import { parseAerationState } from '../parsers/telemetry.js';
import type { RawTelemetry } from '../types-internal.js';
import type { AerationState } from '../types.js';

export async function getAerationState(
  client: AgrologHttpClient,
  aerationAssetId: string,
): Promise<AerationState> {
  const raw = await client.request<RawTelemetry>(
    'GET',
    API_PATHS.ASSET_TELEMETRY(aerationAssetId, TELEMETRY_KEYS.AERATION),
  );
  return parseAerationState(raw);
}
