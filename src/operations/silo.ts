import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, TELEMETRY_KEYS } from '../config/constants.js';
import { parseSiloTelemetry } from '../parsers/telemetry.js';
import type { RawTelemetry, SiloTelemetry } from '../types.js';

export async function getSiloTelemetry(
  client: AgrologHttpClient,
  siloId: string,
): Promise<SiloTelemetry> {
  const raw = await client.request<RawTelemetry>(
    'GET',
    API_PATHS.ASSET_TELEMETRY(siloId, TELEMETRY_KEYS.SILO),
  );
  return parseSiloTelemetry(raw);
}
