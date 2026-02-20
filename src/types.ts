// ─── Configuration ───────────────────────────────────────────────

/** Options for constructing an {@link AgrologClient}. All fields are optional — credentials fall back to environment variables. */
export interface AgrologConfig {
  readonly username?: string;
  readonly password?: string;
  /** ThingsBoard base URL (e.g. `http://console.agrolog.io:8080`). */
  readonly baseUrl?: string;
  /** HTTP request timeout in milliseconds. Default: 30000. */
  readonly timeout?: number;
  /** Log HTTP requests to console. Default: false. */
  readonly debug?: boolean;
}

// ─── Generic timestamped value ───────────────────────────────────

/**
 * A sensor reading paired with its measurement timestamp.
 * All telemetry fields use this wrapper.
 * @typeParam T - The value type (typically `number` for sensor readings, `string` for states).
 */
export interface TimestampedValue<T> {
  /** The measured value, or `null` if the sensor has no reading. */
  readonly value: T | null;
  /** Unix timestamp in milliseconds when the value was recorded, or `null` if unavailable. */
  readonly ts: number | null;
}

// ─── Topology (discovery results) ───────────────────────────────

/** Common fields shared by all discovered ThingsBoard assets. */
interface AssetRecord {
  /** ThingsBoard asset UUID. */
  readonly assetId: string;
  /** Human-readable asset name. */
  readonly name: string;
  /** ThingsBoard asset type (e.g. `silo`, `weather_station`, `aeration`). */
  readonly type: string;
}

/** A grain storage silo asset discovered during topology resolution. */
export interface SiloAsset extends AssetRecord {}

/** A weather station asset discovered during topology resolution. */
export interface WeatherStationAsset extends AssetRecord {}

/** An aeration system asset discovered during topology resolution. */
export interface AeratorAsset extends AssetRecord {}

/**
 * The full site topology returned by {@link AgrologClient.connect}.
 * Contains the customer, site, and all discovered assets.
 */
export interface SiteTopology {
  /** ThingsBoard customer UUID. */
  readonly customerId: string;
  /** ThingsBoard site asset UUID. */
  readonly siteId: string;
  /** All grain silos at this site. */
  readonly silos: readonly SiloAsset[];
  /** The site's weather station, or `null` if none exists. */
  readonly weatherStation: WeatherStationAsset | null;
  /** All aeration systems at this site. */
  readonly aerators: readonly AeratorAsset[];
}

// ─── Silo devices ────────────────────────────────────────────────

/** A device (sensor, indicator) discovered within a silo. */
export interface SiloDevice {
  /** ThingsBoard device UUID. */
  readonly deviceId: string;
  readonly name: string;
  /** Device type (e.g. `temperature_sensor_lines`, `head_space_sensor`, `level_indicator`). */
  readonly type: string;
}

/** All devices discovered within a single silo. */
export interface SiloDevices {
  /** The silo asset ID these devices belong to. */
  readonly siloId: string;
  readonly devices: readonly SiloDevice[];
}

// ─── Telemetry types ─────────────────────────────────────────────

/** Aggregate silo telemetry — min/avg/max for temperature and moisture, each with deltas. All temperatures in °C. */
export interface SiloTelemetry {
  readonly minTemperature: TimestampedValue<number>;
  readonly avgTemperature: TimestampedValue<number>;
  readonly maxTemperature: TimestampedValue<number>;
  /** Minimum temperature change since last reading. */
  readonly minDeltaTemperature: TimestampedValue<number>;
  readonly avgDeltaTemperature: TimestampedValue<number>;
  readonly maxDeltaTemperature: TimestampedValue<number>;
  /** Minimum moisture across all sensors (%). */
  readonly minMoisture: TimestampedValue<number>;
  readonly avgMoisture: TimestampedValue<number>;
  readonly maxMoisture: TimestampedValue<number>;
  readonly minDeltaMoisture: TimestampedValue<number>;
  readonly avgDeltaMoisture: TimestampedValue<number>;
  readonly maxDeltaMoisture: TimestampedValue<number>;
}

/**
 * Per-sensor readings for a temperature/moisture sensor line (sensors 1–3).
 * `sensor3Temperature` is returned as-is from the API — `null` if unavailable; no averaging is applied by the SDK.
 */
export interface SensorLineTelemetry {
  readonly sensor1Temperature: TimestampedValue<number>;
  readonly sensor1DeltaTemperature: TimestampedValue<number>;
  readonly sensor2Temperature: TimestampedValue<number>;
  readonly sensor2DeltaTemperature: TimestampedValue<number>;
  /** Raw API value — `null` if sensor 3 has no reading. SDK does not compute average. */
  readonly sensor3Temperature: TimestampedValue<number>;
  readonly sensor3DeltaTemperature: TimestampedValue<number>;
  readonly sensor1Moisture: TimestampedValue<number>;
  readonly sensor1DeltaMoisture: TimestampedValue<number>;
  readonly sensor2Moisture: TimestampedValue<number>;
  readonly sensor2DeltaMoisture: TimestampedValue<number>;
  readonly sensor3Moisture: TimestampedValue<number>;
  readonly sensor3DeltaMoisture: TimestampedValue<number>;
}

/** Headspace (top-of-silo) environmental sensor readings. */
export interface HeadspaceTelemetry {
  /** Headspace temperature in °C. */
  readonly temperature: TimestampedValue<number>;
  /** Dew point temperature in °C. */
  readonly dewpoint: TimestampedValue<number>;
  /** Headspace relative humidity (%). */
  readonly moisture: TimestampedValue<number>;
  /** CO₂ concentration in ppm. */
  readonly co2Level: TimestampedValue<number>;
  /** Atmospheric pressure in hPa. */
  readonly pressure: TimestampedValue<number>;
}

/** Outdoor weather station readings. */
export interface WeatherTelemetry {
  /** Outdoor temperature in °C. */
  readonly temperature: TimestampedValue<number>;
  /** Outdoor relative humidity (%). */
  readonly humidity: TimestampedValue<number>;
}

/** Current on/off state of an aeration system. */
export interface AerationState {
  /** Aeration state string (e.g. `"on"`, `"off"`). */
  readonly state: TimestampedValue<string>;
}

/** An active alarm reported by ThingsBoard for an entity. */
export interface Alarm {
  readonly alarmId: string;
  readonly name: string;
  /** Alarm type code (e.g. `HIGH_TEMP`). */
  readonly type: string;
  /** Severity level (e.g. `CRITICAL`, `WARNING`). */
  readonly severity: string;
  /** Current status (e.g. `ACTIVE_UNACK`, `CLEARED_ACK`). */
  readonly status: string;
  /** Unix timestamp (ms) when the alarm was created. */
  readonly createdTime: number;
  /** Unix timestamp (ms) when the alarm condition started. */
  readonly startTs: number;
  /** Unix timestamp (ms) when the alarm ended (0 if still active). */
  readonly endTs: number;
  /** ThingsBoard entity ID that triggered this alarm. */
  readonly originatorId: string;
  /** Arbitrary alarm details from ThingsBoard. */
  readonly details: Record<string, unknown>;
}
