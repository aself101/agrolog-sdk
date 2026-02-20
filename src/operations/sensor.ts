import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, TELEMETRY_KEYS } from '../config/constants.js';
import { parseSensorLineTelemetry } from '../parsers/telemetry.js';
import type { RawTelemetry } from '../types-internal.js';
import type { SensorLineTelemetry } from '../types.js';

export async function getSensorLineTelemetry(
  client: AgrologHttpClient,
  sensorDeviceId: string,
): Promise<SensorLineTelemetry> {
  const raw = await client.request<RawTelemetry>(
    'GET',
    API_PATHS.DEVICE_TELEMETRY(sensorDeviceId, TELEMETRY_KEYS.SENSOR_LINE),
  );
  return parseSensorLineTelemetry(raw);
}
