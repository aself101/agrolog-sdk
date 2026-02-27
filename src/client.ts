import { AgrologHttpClient } from './http/http-client.js';
import { TokenManager } from './auth.js';
import { loadConfig } from './config/loaders.js';
import { AgrologAPIError } from './errors.js';
import { ERROR_CODES } from './config/constants.js';
import { discoverTopology, discoverSiloDevices } from './discovery/discovery.js';
import { getSiloTelemetry } from './operations/silo.js';
import { getSensorLineTelemetry } from './operations/sensor.js';
import { getHeadspaceTelemetry } from './operations/headspace.js';
import { getWeatherTelemetry } from './operations/weather.js';
import { getAerationState } from './operations/aeration.js';
import { getAlarms } from './operations/alarms.js';
import type {
  AgrologConfig,
  SiteTopology,
  SiloDevices,
  SiloTelemetry,
  BulkTelemetryResult,
  SensorLineTelemetry,
  HeadspaceTelemetry,
  WeatherTelemetry,
  AerationState,
  Alarm,
} from './types.js';

/**
 * AgrologClient is the main entry point for the Agrolog IoT SDK.
 * It provides a typed, authenticated interface to the ThingsBoard API
 * used by Agrolog silo monitoring systems.
 *
 * @example
 * ```ts
 * const client = new AgrologClient({
 *   username: 'user@example.com',
 *   password: 'secret',
 *   baseUrl: 'https://console.agrolog.io',
 * });
 *
 * const topology = await client.connect();
 * const telemetry = await client.getSiloTelemetry(topology.silos[0].assetId);
 * console.log(`Avg temp: ${telemetry.avgTemperature.value}°C`);
 * ```
 */
export class AgrologClient {
  private readonly httpClient: AgrologHttpClient;
  private readonly tokenManager: TokenManager;
  private topology: SiteTopology | null = null;

  /**
   * Creates a new AgrologClient.
   * Credentials are resolved from (highest priority first):
   *   1. `config` object properties
   *   2. `AGROLOG_USERNAME` / `AGROLOG_PASSWORD` / `AGROLOG_THINGSBOARD_URL` env vars
   *   3. `.env` file in the working directory
   *
   * @param config - Optional configuration overrides
   * @throws {Error} If username or password cannot be resolved
   */
  constructor(config?: AgrologConfig) {
    const resolved = loadConfig(config);

    this.httpClient = new AgrologHttpClient(resolved.baseUrl, resolved.timeout, resolved.log);
    this.tokenManager = new TokenManager(resolved.username, resolved.password);

    // Wire auth into HTTP client
    this.httpClient.setAuth(
      () => this.tokenManager.getValidToken(this.httpClient),
      async () => { await this.tokenManager.refreshToken(this.httpClient); },
    );
  }

  // ─── Discovery ───────────────────────────────────────────────

  /**
   * Discovers the site topology: customer ID, site ID, silos, weather station, and aerators.
   * Must be called before any telemetry methods.
   *
   * @returns The fully resolved site topology
   * @throws {AgrologAPIError} If authentication or discovery fails
   */
  async connect(): Promise<SiteTopology> {
    this.topology = await discoverTopology(this.httpClient);
    return this.topology;
  }

  /**
   * Returns the topology discovered by the last `connect()` call.
   *
   * @returns The site topology from the last `connect()` call
   * @throws {AgrologAPIError} If `connect()` has not been called
   */
  getTopology(): SiteTopology {
    return this.connectedTopology();
  }

  /** Returns true if `connect()` has been successfully called. */
  isConnected(): boolean {
    return this.topology !== null;
  }

  // ─── Telemetry ───────────────────────────────────────────────

  /**
   * Fetches current telemetry for a silo asset.
   * Returns 12 fields (min/avg/max temperature and moisture, with deltas).
   * All temperature values are raw Celsius from the API.
   *
   * @param siloId - Asset ID of the silo (from topology.silos)
   * @returns Parsed silo telemetry with min/avg/max temperature and moisture values
   */
  async getSiloTelemetry(siloId: string): Promise<SiloTelemetry> {
    this.connectedTopology();
    return getSiloTelemetry(this.httpClient, siloId);
  }

  /**
   * Fetches sensor line telemetry for a temperature/moisture sensor device.
   * Returns readings for sensors 1–3. `sensor3Temperature` is returned as-is
   * from the API (null if not available — no averaging is applied).
   *
   * @param sensorDeviceId - Device ID of the sensor line
   * @returns Per-sensor readings for sensors 1–3 with temperature, moisture, and deltas
   */
  async getSensorLineTelemetry(sensorDeviceId: string): Promise<SensorLineTelemetry> {
    this.connectedTopology();
    return getSensorLineTelemetry(this.httpClient, sensorDeviceId);
  }

  /**
   * Fetches headspace sensor telemetry for a silo.
   * Automatically discovers the headspace device within the silo first.
   *
   * @param siloId - Asset ID of the silo (from topology.silos)
   * @throws {AgrologAPIError} If no headspace sensor is found in the silo
   */
  async getHeadspaceTelemetry(siloId: string): Promise<HeadspaceTelemetry> {
    this.connectedTopology();
    return getHeadspaceTelemetry(this.httpClient, siloId);
  }

  /**
   * Fetches weather station telemetry (temperature and humidity).
   * Automatically discovers the weather device. Defaults to the weather
   * station found in topology if no explicit ID is provided.
   *
   * @param wsAssetId - Optional weather station asset ID override
   * @throws {AgrologAPIError} If no weather station is found
   */
  async getWeatherTelemetry(wsAssetId?: string): Promise<WeatherTelemetry> {
    const topology = this.connectedTopology();
    const assetId = wsAssetId ?? topology.weatherStation?.assetId;
    if (!assetId) {
      throw new AgrologAPIError(
        'No weather station found in topology. Pass a weatherStationAssetId explicitly.',
        ERROR_CODES.DISCOVERY_FAILED,
      );
    }
    return getWeatherTelemetry(this.httpClient, assetId);
  }

  /**
   * Fetches the on/off state of an aeration system.
   *
   * @param aeratorAssetId - Asset ID of the aerator (from topology.aerators)
   * @returns Current on/off state with timestamp
   */
  async getAerationState(aeratorAssetId: string): Promise<AerationState> {
    this.connectedTopology();
    return getAerationState(this.httpClient, aeratorAssetId);
  }

  /**
   * Fetches active alarms for a given entity (silo, aerator, etc.).
   *
   * @param entityId - Asset ID to query alarms for
   * @param limit - Maximum number of alarms to return (default: 10)
   * @returns Array of active alarms for the entity
   */
  async getAlarms(entityId: string, limit?: number): Promise<Alarm[]> {
    this.connectedTopology();
    return getAlarms(this.httpClient, entityId, limit);
  }

  // ─── Device Discovery ────────────────────────────────────────

  /**
   * Discovers all devices within a silo (temperature sensors, moisture sensors,
   * headspace sensor, level indicator).
   *
   * @param siloId - Asset ID of the silo
   * @returns Discovered devices (temperature sensors, moisture sensors, headspace, level indicator)
   */
  async discoverSiloDevices(siloId: string): Promise<SiloDevices> {
    this.connectedTopology();
    return discoverSiloDevices(this.httpClient, siloId);
  }

  // ─── Convenience ─────────────────────────────────────────────

  /**
   * Fetches telemetry for all silos in the topology in parallel.
   * Uses `Promise.allSettled` — partial results are returned if some silos fail.
   * Check `errors` on the result to detect incomplete data.
   * Throws only if **all** silos fail.
   *
   * @returns Object with `results` Map and `errors` Map for any failed silos
   */
  async getAllSiloTelemetry(): Promise<BulkTelemetryResult> {
    const topology = this.connectedTopology();
    const settled = await Promise.allSettled(
      topology.silos.map(async silo => {
        const telemetry = await getSiloTelemetry(this.httpClient, silo.assetId);
        return [silo.assetId, telemetry] as const;
      }),
    );

    const results = new Map<string, SiloTelemetry>();
    const errors = new Map<string, Error>();

    for (let i = 0; i < settled.length; i++) {
      const result = settled[i];
      const siloId = topology.silos[i]?.assetId ?? `unknown-${i}`;
      if (result?.status === 'fulfilled') {
        results.set(result.value[0], result.value[1]);
      } else if (result) {
        const reason = result.reason;
        errors.set(siloId, reason instanceof Error ? reason : new Error(String(reason)));
      }
    }

    if (errors.size > 0 && results.size === 0) {
      const firstError = errors.values().next().value;
      if (firstError) throw firstError;
    }

    return { results, errors };
  }

  // ─── Auth ────────────────────────────────────────────────────

  /**
   * Forces a token refresh. Useful if you receive an auth error outside
   * the automatic retry flow, or if you know the token has been revoked.
   */
  async refreshAuth(): Promise<void> {
    this.tokenManager.clearToken();
    await this.tokenManager.refreshToken(this.httpClient);
  }

  // ─── Internal ────────────────────────────────────────────────

  /** Asserts connected and returns the narrowed topology (no `!` needed). */
  private connectedTopology(): SiteTopology {
    if (!this.topology) {
      throw new AgrologAPIError(
        'Client not connected. Call connect() before making data requests.',
        ERROR_CODES.NOT_CONNECTED,
      );
    }
    return this.topology;
  }
}
