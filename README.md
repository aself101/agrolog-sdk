# agrolog-sdk

TypeScript SDK for the Agrolog IoT ThingsBoard API. Provides typed, authenticated access to silo telemetry, sensor readings, weather stations, aeration systems, and alarms.

## Installation

```bash
npm install agrolog-sdk
```

Requires Node.js ≥ 18.

## Quick Start

```ts
import { AgrologClient } from 'agrolog-sdk';

const client = new AgrologClient({
  username: 'user@example.com',
  password: 'secret',
  baseUrl: 'http://console.agrolog.io:8080',
});

// Discover topology (must call first)
const topology = await client.connect();
console.log(`Found ${topology.silos.length} silos`);

// Fetch silo telemetry
const telemetry = await client.getSiloTelemetry(topology.silos[0].assetId);
console.log(`Avg temp: ${telemetry.avgTemperature.value}°C`);
console.log(`Avg moisture: ${telemetry.avgMoisture.value}%`);

// Fetch weather
const weather = await client.getWeatherTelemetry();
console.log(`Outdoor temp: ${weather.temperature.value}°C`);
```

## Configuration

Credentials are resolved in priority order:

1. `config` object passed to the constructor
2. Environment variables: `AGROLOG_USERNAME`, `AGROLOG_PASSWORD`, `AGROLOG_THINGSBOARD_URL`
3. `.env` file in the working directory

```ts
// Explicit config
const client = new AgrologClient({
  username: 'user@example.com',
  password: 'secret',
  baseUrl: 'http://console.agrolog.io:8080',
  timeout: 30000,  // ms, default 30s
  debug: false,    // log HTTP requests to console
});

// From environment / .env file
const client = new AgrologClient();
```

**.env file example:**

```env
AGROLOG_USERNAME=user@example.com
AGROLOG_PASSWORD=secret
AGROLOG_THINGSBOARD_URL=http://console.agrolog.io:8080
```

## API Reference

### `new AgrologClient(config?)`

Creates a new client. Throws if `username` or `password` cannot be resolved.

### `client.connect(): Promise<SiteTopology>`

Authenticates and discovers the site topology: customer, site, silos, weather station, and aerators. **Must be called before any telemetry methods.**

```ts
const topology = await client.connect();
// topology.customerId  — ThingsBoard customer ID
// topology.siteId      — Site asset ID
// topology.silos       — Array of { assetId, name, type }
// topology.weatherStation — { assetId, name, type } or null
// topology.aerators    — Array of { assetId, name, type }
```

### `client.getTopology(): SiteTopology`

Returns the topology from the last `connect()` call. Throws `AgrologAPIError` (`NOT_CONNECTED`) if `connect()` has not been called.

### `client.isConnected(): boolean`

Returns `true` if `connect()` has been successfully called.

### `client.getSiloTelemetry(siloId: string): Promise<SiloTelemetry>`

Fetches current aggregate telemetry for a silo asset.

```ts
const t = await client.getSiloTelemetry(topology.silos[0].assetId);

// Temperature (°C)
t.minTemperature.value    // number | null
t.avgTemperature.value
t.maxTemperature.value

// Delta temperature (change since last reading)
t.minDeltaTemperature.value
t.avgDeltaTemperature.value
t.maxDeltaTemperature.value

// Moisture (%)
t.minMoisture.value
t.avgMoisture.value
t.maxMoisture.value

// Delta moisture
t.minDeltaMoisture.value
t.avgDeltaMoisture.value
t.maxDeltaMoisture.value

// Each field also has a timestamp (Unix ms or null):
t.avgTemperature.ts   // number | null
```

### `client.getSensorLineTelemetry(sensorDeviceId: string): Promise<SensorLineTelemetry>`

Fetches per-sensor readings for a temperature/moisture sensor device (sensors 1–3).

```ts
const t = await client.getSensorLineTelemetry(deviceId);
t.sensor1Temperature.value   // °C, number | null
t.sensor2Temperature.value
t.sensor3Temperature.value   // null if not available — SDK does NOT compute avg
t.sensor1Moisture.value      // %, number | null
// ...plus delta variants for each sensor
```

### `client.getHeadspaceTelemetry(siloId: string): Promise<HeadspaceTelemetry>`

Fetches headspace sensor readings for a silo. Automatically discovers the headspace device.

```ts
const t = await client.getHeadspaceTelemetry(topology.silos[0].assetId);
t.temperature.value  // °C
t.dewpoint.value     // °C
t.moisture.value     // %
t.co2Level.value     // ppm
t.pressure.value     // hPa
```

### `client.getWeatherTelemetry(wsAssetId?: string): Promise<WeatherTelemetry>`

Fetches weather station telemetry. Defaults to the weather station discovered by `connect()`.

```ts
const weather = await client.getWeatherTelemetry();
weather.temperature.value  // °C
weather.humidity.value     // %

// Or pass an explicit asset ID:
const weather = await client.getWeatherTelemetry('ws-asset-id');
```

### `client.getAerationState(aeratorAssetId: string): Promise<AerationState>`

Fetches the on/off state of an aeration system.

```ts
const aeration = await client.getAerationState(topology.aerators[0].assetId);
aeration.state.value  // string, e.g. 'on' | 'off'
aeration.state.ts     // Unix ms timestamp
```

### `client.getAlarms(entityId: string, limit?: number): Promise<Alarm[]>`

Fetches active alarms for an entity (silo, aerator, etc.). Default limit: 10.

```ts
const alarms = await client.getAlarms(topology.silos[0].assetId, 25);
alarms.forEach(a => {
  console.log(`${a.name} [${a.severity}]: ${a.status}`);
  // a.alarmId, a.type, a.createdTime, a.startTs, a.endTs, a.details
});
```

### `client.getSiloDevices(siloId: string): Promise<SiloDevices>`

Discovers all devices within a silo (temperature sensors, moisture sensors, headspace sensor, level indicator).

```ts
const { siloId, devices } = await client.getSiloDevices(topology.silos[0].assetId);
devices.forEach(d => console.log(`${d.name} (${d.type}): ${d.deviceId}`));
```

### `client.getAllSiloTelemetry(): Promise<Map<string, SiloTelemetry>>`

Fetches telemetry for all silos in parallel.

```ts
const all = await client.getAllSiloTelemetry();
for (const [siloId, telemetry] of all) {
  console.log(`${siloId}: ${telemetry.avgTemperature.value}°C`);
}
```

### `client.refreshAuth(): Promise<void>`

Forces a token refresh. Useful if you receive an auth error outside the automatic retry flow.

## Error Handling

All methods throw `AgrologAPIError` on failure.

```ts
import { AgrologClient, AgrologAPIError } from 'agrolog-sdk';
import { ERROR_CODES } from 'agrolog-sdk/config';

try {
  await client.connect();
  const telemetry = await client.getSiloTelemetry(siloId);
} catch (err) {
  if (err instanceof AgrologAPIError) {
    console.error(`[${err.code}] ${err.message}`);
    // err.httpStatus — HTTP status code (if applicable)
    // err.endpoint   — API endpoint that failed

    if (err.isRetryable()) {
      // Safe to retry: 502, 503, 504, or SERVICE_UNAVAILABLE
    }
    if (err.isAuthError()) {
      // Authentication failed: 401, 403, AUTH_FAILED, or TOKEN_EXPIRED
    }
    if (err.code === ERROR_CODES.NOT_CONNECTED) {
      // Forgot to call connect() first
    }
  }
}
```

**Error codes** (from `agrolog-sdk/config` → `ERROR_CODES`):

| Code | When thrown |
|------|-------------|
| `NOT_CONNECTED` | Data method called before `connect()` |
| `AUTH_FAILED` | Login failed (bad credentials) |
| `TOKEN_EXPIRED` | Token expired and could not be refreshed |
| `DISCOVERY_FAILED` | Site, weather station, or device not found |
| `REQUEST_FAILED` | HTTP request failed after retries |
| `SERVICE_UNAVAILABLE` | Server returned 502/503/504 |

## Telemetry Values

All telemetry fields return a `TimestampedValue<T>`:

```ts
interface TimestampedValue<T> {
  value: T | null;  // null if the sensor has no reading
  ts: number | null; // Unix timestamp in milliseconds
}
```

All temperature values are **raw Celsius** — no conversion is applied. If `sensor3Temperature` is null in the API response, the SDK returns null (does not compute an average).

## Export Paths

```ts
import { AgrologClient, AgrologAPIError } from 'agrolog-sdk';
import type { SiloTelemetry, WeatherTelemetry, Alarm } from 'agrolog-sdk/types';
import { ERROR_CODES, DEFAULT_BASE_URL } from 'agrolog-sdk/config';
import { AgrologAPIError } from 'agrolog-sdk/errors';
```

## License

MIT
