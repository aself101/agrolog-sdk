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

export class AgrologClient {
  private readonly httpClient: AgrologHttpClient;
  private readonly tokenManager: TokenManager;
  private topology: SiteTopology | null = null;

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

  async connect(): Promise<SiteTopology> {
    this.topology = await discoverTopology(this.httpClient);
    return this.topology;
  }

  getTopology(): SiteTopology {
    this.ensureConnected();
    return this.topology!;
  }

  isConnected(): boolean {
    return this.topology !== null;
  }

  // ─── Telemetry ───────────────────────────────────────────────

  async getSiloTelemetry(siloId: string): Promise<SiloTelemetry> {
    this.ensureConnected();
    return getSiloTelemetry(this.httpClient, siloId);
  }

  async getSensorLineTelemetry(sensorDeviceId: string): Promise<SensorLineTelemetry> {
    this.ensureConnected();
    return getSensorLineTelemetry(this.httpClient, sensorDeviceId);
  }

  async getHeadspaceTelemetry(siloId: string): Promise<HeadspaceTelemetry> {
    this.ensureConnected();
    return getHeadspaceTelemetry(this.httpClient, siloId);
  }

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

  async getAerationState(aeratorAssetId: string): Promise<AerationState> {
    this.ensureConnected();
    return getAerationState(this.httpClient, aeratorAssetId);
  }

  async getAlarms(entityId: string, limit?: number): Promise<Alarm[]> {
    this.ensureConnected();
    return getAlarms(this.httpClient, entityId, limit);
  }

  // ─── Device Discovery ────────────────────────────────────────

  async getSiloDevices(siloId: string): Promise<SiloDevices> {
    this.ensureConnected();
    return discoverSiloDevices(this.httpClient, siloId);
  }

  // ─── Convenience ─────────────────────────────────────────────

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
