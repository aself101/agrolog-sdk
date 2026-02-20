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
 *   baseUrl: 'http://console.agrolog.io:8080',
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

    this.httpClient = new AgrologHttpClient(resolved.baseUrl, resolved.timeout, resolved.debug);
    this.tokenManager = new TokenManager(resolved.username, resolved.password);

    // Wire auth into HTTP client
    this.httpClient.setAuth(
      () => this.tokenManager.getValidToken(this.httpClient),
      () => this.tokenManager.refreshToken(this.httpClient).then(() => undefined),
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
   * @throws {AgrologAPIError} If `connect()` has not been called
   */
  getTopology(): SiteTopology {
    this.ensureConnected();
    return this.topology!;
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
   */
  async getSiloTelemetry(siloId: string): Promise<SiloTelemetry> {
    this.ensureConnected();
    return getSiloTelemetry(this.httpClient, siloId);
  }

  /**
   * Fetches sensor line telemetry for a temperature/moisture sensor device.
   * Returns readings for sensors 1–3. `sensor3Temperature` is returned as-is
   * from the API (null if not available — no averaging is applied).
   *
   * @param sensorDeviceId - Device ID of the sensor line
   */
  async getSensorLineTelemetry(sensorDeviceId: string): Promise<SensorLineTelemetry> {
    this.ensureConnected();
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
    this.ensureConnected();
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
    this.ensureConnected();
    const assetId = wsAssetId ?? this.topology!.weatherStation?.assetId;
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
   */
  async getAerationState(aeratorAssetId: string): Promise<AerationState> {
    this.ensureConnected();
    return getAerationState(this.httpClient, aeratorAssetId);
  }

  /**
   * Fetches active alarms for a given entity (silo, aerator, etc.).
   *
   * @param entityId - Asset ID to query alarms for
   * @param limit - Maximum number of alarms to return (default: 10)
   */
  async getAlarms(entityId: string, limit?: number): Promise<Alarm[]> {
    this.ensureConnected();
    return getAlarms(this.httpClient, entityId, limit);
  }

  // ─── Device Discovery ────────────────────────────────────────

  /**
   * Discovers all devices within a silo (temperature sensors, moisture sensors,
   * headspace sensor, level indicator).
   *
   * @param siloId - Asset ID of the silo
   */
  async getSiloDevices(siloId: string): Promise<SiloDevices> {
    this.ensureConnected();
    return discoverSiloDevices(this.httpClient, siloId);
  }

  // ─── Convenience ─────────────────────────────────────────────

  /**
   * Fetches telemetry for all silos in the topology in parallel.
   *
   * @returns Map of siloAssetId → SiloTelemetry
   */
  async getAllSiloTelemetry(): Promise<Map<string, SiloTelemetry>> {
    this.ensureConnected();
    const results = new Map<string, SiloTelemetry>();
    const promises = this.topology!.silos.map(async silo => {
      const telemetry = await getSiloTelemetry(this.httpClient, silo.assetId);
      results.set(silo.assetId, telemetry);
    });
    await Promise.all(promises);
    return results;
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

  private ensureConnected(): void {
    if (!this.topology) {
      throw new AgrologAPIError(
        'Client not connected. Call connect() before making data requests.',
        ERROR_CODES.NOT_CONNECTED,
      );
    }
  }
}
