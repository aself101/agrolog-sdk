// ─── Configuration ───────────────────────────────────────────────

export interface AgrologConfig {
  readonly username?: string;
  readonly password?: string;
  readonly baseUrl?: string;
  readonly timeout?: number;
  readonly debug?: boolean;
}

// ─── Generic timestamped value ───────────────────────────────────

export interface TimestampedValue<T> {
  readonly value: T | null;
  readonly ts: number | null;
}

// ─── Topology (discovery results) ───────────────────────────────

export interface SiloAsset {
  readonly assetId: string;
  readonly name: string;
  readonly type: string;
}

export interface WeatherStationAsset {
  readonly assetId: string;
  readonly name: string;
  readonly type: string;
}

export interface AeratorAsset {
  readonly assetId: string;
  readonly name: string;
  readonly type: string;
}

export interface SiteTopology {
  readonly customerId: string;
  readonly siteId: string;
  readonly silos: readonly SiloAsset[];
  readonly weatherStation: WeatherStationAsset | null;
  readonly aerators: readonly AeratorAsset[];
}

// ─── Silo devices ────────────────────────────────────────────────

export interface SiloDevice {
  readonly deviceId: string;
  readonly name: string;
  readonly type: string;
}

export interface SiloDevices {
  readonly siloId: string;
  readonly devices: readonly SiloDevice[];
}

// ─── Telemetry types ─────────────────────────────────────────────

export interface SiloTelemetry {
  readonly minTemperature: TimestampedValue<number>;
  readonly avgTemperature: TimestampedValue<number>;
  readonly maxTemperature: TimestampedValue<number>;
  readonly minDeltaTemperature: TimestampedValue<number>;
  readonly avgDeltaTemperature: TimestampedValue<number>;
  readonly maxDeltaTemperature: TimestampedValue<number>;
  readonly minMoisture: TimestampedValue<number>;
  readonly avgMoisture: TimestampedValue<number>;
  readonly maxMoisture: TimestampedValue<number>;
  readonly minDeltaMoisture: TimestampedValue<number>;
  readonly avgDeltaMoisture: TimestampedValue<number>;
  readonly maxDeltaMoisture: TimestampedValue<number>;
}

export interface SensorLineTelemetry {
  readonly sensor1Temperature: TimestampedValue<number>;
  readonly sensor1DeltaTemperature: TimestampedValue<number>;
  readonly sensor2Temperature: TimestampedValue<number>;
  readonly sensor2DeltaTemperature: TimestampedValue<number>;
  readonly sensor3Temperature: TimestampedValue<number>;
  readonly sensor3DeltaTemperature: TimestampedValue<number>;
  readonly sensor1Moisture: TimestampedValue<number>;
  readonly sensor1DeltaMoisture: TimestampedValue<number>;
  readonly sensor2Moisture: TimestampedValue<number>;
  readonly sensor2DeltaMoisture: TimestampedValue<number>;
  readonly sensor3Moisture: TimestampedValue<number>;
  readonly sensor3DeltaMoisture: TimestampedValue<number>;
}

export interface HeadspaceTelemetry {
  readonly temperature: TimestampedValue<number>;
  readonly dewpoint: TimestampedValue<number>;
  readonly moisture: TimestampedValue<number>;
  readonly co2Level: TimestampedValue<number>;
  readonly pressure: TimestampedValue<number>;
}

export interface WeatherTelemetry {
  readonly temperature: TimestampedValue<number>;
  readonly humidity: TimestampedValue<number>;
}

export interface AerationState {
  readonly state: TimestampedValue<string>;
}

export interface Alarm {
  readonly alarmId: string;
  readonly name: string;
  readonly type: string;
  readonly severity: string;
  readonly status: string;
  readonly createdTime: number;
  readonly startTs: number;
  readonly endTs: number;
  readonly originatorId: string;
  readonly details: Record<string, unknown>;
}

// ─── Raw ThingsBoard types (internal) ────────────────────────────

export interface RawTelemetryEntry {
  readonly value: string;
  readonly ts: number;
}

export type RawTelemetry = Record<string, RawTelemetryEntry[]>;

export interface RawEntityId {
  readonly id: string;
  readonly entityType: string;
}

export interface RawAsset {
  readonly id: RawEntityId;
  readonly name: string;
  readonly type: string;
}

export interface RawDevice {
  readonly id: RawEntityId;
  readonly name: string;
  readonly type: string;
}

export interface RawAlarm {
  readonly id: RawEntityId;
  readonly name: string;
  readonly type: string;
  readonly severity: string;
  readonly status: string;
  readonly createdTime: number;
  readonly startTs: number;
  readonly endTs: number;
  readonly originator: RawEntityId;
  readonly details: Record<string, unknown>;
}

export interface RawAlarmResponse {
  readonly data: RawAlarm[];
  readonly totalPages: number;
  readonly totalElements: number;
  readonly hasNext: boolean;
}

export interface RawUserResponse {
  readonly customerId: RawEntityId;
}

// ─── HTTP types (internal) ───────────────────────────────────────

export interface RequestOptions {
  readonly timeout?: number;
  readonly params?: Record<string, string | number>;
}
