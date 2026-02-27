<p align="center">
  <img src="agrolog.png" alt="Agrolog" width="400">
</p>

# agrolog-sdk

<p align="center">
  <a href="https://www.npmjs.com/package/agrolog-sdk"><img src="https://img.shields.io/npm/v/agrolog-sdk.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/agrolog-sdk"><img src="https://img.shields.io/npm/dm/agrolog-sdk.svg" alt="npm downloads"></a>
  <a href="https://github.com/aself101/agrolog-sdk/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/agrolog-sdk.svg" alt="license"></a>
  <a href="https://www.npmjs.com/package/agrolog-sdk"><img src="https://img.shields.io/node/v/agrolog-sdk.svg" alt="node version"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-ESM--only-blue.svg" alt="TypeScript ESM-only"></a>
</p>

TypeScript SDK for the Agrolog IoT ThingsBoard API. Provides typed, authenticated access to silo telemetry, sensor readings, weather stations, aeration systems, and alarms.

## Installation

```bash
npm install agrolog-sdk
```

Requires Node.js >= 18. This package is **ESM-only** — use `import`, not `require()`.

## Quick Start

```ts
import { AgrologClient } from 'agrolog-sdk';

const client = new AgrologClient({
  username: 'user@example.com',
  password: 'secret',
  baseUrl: 'https://console.agrolog.io',
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
  baseUrl: 'https://console.agrolog.io',
  timeout: 30000,  // ms, default 30s
  logger: (msg) => console.log(msg),  // optional debug logging callback
});

// From environment / .env file
const client = new AgrologClient();
```

> **Security note:** The default `baseUrl` uses HTTPS. If your ThingsBoard instance
> uses plain HTTP, set `baseUrl` explicitly. Credentials are sent over the network
> during login — avoid unencrypted connections in production.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `username` | `string` | env `AGROLOG_USERNAME` | ThingsBoard login |
| `password` | `string` | env `AGROLOG_PASSWORD` | ThingsBoard password |
| `baseUrl` | `string` | `https://console.agrolog.io` | ThingsBoard base URL |
| `timeout` | `number` | `30000` | HTTP timeout (ms) |
| `logger` | `(message: string) => void` | — | Debug log callback. Log messages include request paths and retry info but never credentials or tokens. |
| `debug` | `boolean` | — | **Deprecated — will be removed in v2.0.0.** When `true` and no `logger` set, uses `console.log`. Use `logger: (msg) => console.log(msg)` instead. |

**.env file example:**

```env
AGROLOG_USERNAME=user@example.com
AGROLOG_PASSWORD=secret
AGROLOG_THINGSBOARD_URL=https://console.agrolog.io
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

Fetches per-sensor readings for a temperature/moisture sensor device (sensors 1-3).

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

Fetches active alarms for an entity (silo, aerator, etc.). Default limit: 10, max: 1000.

```ts
const alarms = await client.getAlarms(topology.silos[0].assetId, 25);
alarms.forEach(a => {
  console.log(`${a.name} [${a.severity}]: ${a.status}`);
  // a.alarmId, a.type, a.createdTime, a.startTs, a.endTs, a.originatorId, a.details
});
```

### `client.discoverSiloDevices(siloId: string): Promise<SiloDevices>`

Discovers all devices within a silo (temperature sensors, moisture sensors, headspace sensor, level indicator).

```ts
const { siloId, devices } = await client.discoverSiloDevices(topology.silos[0].assetId);
devices.forEach(d => console.log(`${d.name} (${d.type}): ${d.deviceId}`));
```

### `client.getAllSiloTelemetry(): Promise<BulkTelemetryResult>`

Fetches telemetry for all silos in parallel. Uses `Promise.allSettled` — partial results are returned if some silos fail. Throws only if **all** silos fail.

```ts
const bulk = await client.getAllSiloTelemetry();

// Successful results
for (const [siloId, telemetry] of bulk.results) {
  console.log(`${siloId}: ${telemetry.avgTemperature.value}°C`);
}

// Check for partial failures
if (bulk.errors.size > 0) {
  for (const [siloId, error] of bulk.errors) {
    console.warn(`Failed to fetch ${siloId}: ${error.message}`);
  }
}
```

### `client.refreshAuth(): Promise<void>`

Forces a token refresh. Useful if you receive an auth error outside the automatic retry flow.

```ts
try {
  await client.getSiloTelemetry(siloId);
} catch (err) {
  if (err instanceof AgrologAPIError && err.isAuthError()) {
    await client.refreshAuth();
    // Retry the request with the new token
    const telemetry = await client.getSiloTelemetry(siloId);
  }
}
```

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
      // Safe to retry: 5xx, TIMEOUT, or NETWORK_ERROR
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

**Error codes** (from `agrolog-sdk/config` -> `ERROR_CODES`):

| Code | When thrown |
|------|-------------|
| `NOT_CONNECTED` | Data method called before `connect()` |
| `AUTH_FAILED` | Login failed (bad credentials) |
| `TOKEN_EXPIRED` | Token expired and could not be refreshed (reserved) |
| `DISCOVERY_FAILED` | Site, weather station, or device not found |
| `REQUEST_FAILED` | HTTP request failed after retries |
| `SERVICE_UNAVAILABLE` | Server returned 5xx |
| `TELEMETRY_FAILED` | Telemetry request or parse failed (reserved) |
| `TIMEOUT` | Request timed out |
| `NETWORK_ERROR` | Network-level failure (no response) |

## Telemetry Values

All telemetry fields return a `TimestampedValue<T>`:

```ts
interface TimestampedValue<T extends string | number | boolean> {
  value: T | null;  // null if the sensor has no reading
  ts: number | null; // Unix timestamp in milliseconds
}
```

All temperature values are **raw Celsius** — no conversion is applied. If `sensor3Temperature` is null in the API response, the SDK returns null (does not compute an average).

## Export Paths

```ts
// Primary imports (recommended)
import { AgrologClient, AgrologAPIError } from 'agrolog-sdk';

// All public types
import type {
  AgrologConfig,
  TimestampedValue,
  SiteTopology,
  SiloAsset,
  WeatherStationAsset,
  AeratorAsset,
  SiloDevice,
  SiloDevices,
  SiloTelemetry,
  BulkTelemetryResult,
  SensorLineTelemetry,
  HeadspaceTelemetry,
  WeatherTelemetry,
  AerationState,
  Alarm,
} from 'agrolog-sdk/types';

// Constants and error codes
import { ERROR_CODES, DEFAULT_BASE_URL, DEFAULT_TIMEOUT } from 'agrolog-sdk/config';

// Error class from dedicated path
import { AgrologAPIError } from 'agrolog-sdk/errors';
```

## License

MIT
