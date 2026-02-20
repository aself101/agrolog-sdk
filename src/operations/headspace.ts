import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, TELEMETRY_KEYS, ERROR_CODES } from '../config/constants.js';
import { parseHeadspaceTelemetry } from '../parsers/telemetry.js';
import { discoverSiloDevices } from '../discovery/discovery.js';
import { AgrologAPIError } from '../errors.js';
import type { RawTelemetry } from '../types-internal.js';
import type { HeadspaceTelemetry } from '../types.js';

export async function getHeadspaceTelemetry(
  client: AgrologHttpClient,
  siloId: string,
): Promise<HeadspaceTelemetry> {
  // Discover headspace sensor device within the silo
  const siloDevices = await discoverSiloDevices(client, siloId);
  const headspaceSensor = siloDevices.devices.find(d => d.type === 'head_space_sensor');

  if (!headspaceSensor) {
    throw new AgrologAPIError(
      `No headspace sensor found for silo ${siloId}`,
      ERROR_CODES.DISCOVERY_FAILED,
    );
  }

  const raw = await client.request<RawTelemetry>(
    'GET',
    API_PATHS.DEVICE_TELEMETRY(headspaceSensor.deviceId, TELEMETRY_KEYS.HEADSPACE),
  );
  return parseHeadspaceTelemetry(raw);
}
