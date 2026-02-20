import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, TELEMETRY_KEYS } from '../config/constants.js';
import { parseWeatherTelemetry } from '../parsers/telemetry.js';
import { discoverWeatherDevice } from '../discovery/discovery.js';
import type { RawTelemetry, WeatherTelemetry } from '../types.js';

export async function getWeatherTelemetry(
  client: AgrologHttpClient,
  weatherStationAssetId: string,
): Promise<WeatherTelemetry> {
  // 2-step: discover the weather device, then fetch its telemetry
  const deviceId = await discoverWeatherDevice(client, weatherStationAssetId);

  const raw = await client.request<RawTelemetry>(
    'GET',
    API_PATHS.DEVICE_TELEMETRY(deviceId, TELEMETRY_KEYS.WEATHER),
  );
  return parseWeatherTelemetry(raw);
}
