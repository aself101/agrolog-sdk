/**
 * Internal ThingsBoard wire-format types. Not part of the public API —
 * consumers should use the typed interfaces from `./types.ts` instead.
 * @internal
 */

// ─── Raw ThingsBoard types ──────────────────────────────────────

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

// ─── HTTP types ─────────────────────────────────────────────────

export interface RequestOptions {
  readonly timeout?: number;
  readonly params?: Record<string, string | number>;
}
