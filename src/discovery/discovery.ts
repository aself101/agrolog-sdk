import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, DISCOVERY_ASSET_TYPES, DISCOVERY_DEVICE_TYPES, ERROR_CODES } from '../config/constants.js';
import { AgrologAPIError } from '../errors.js';
import type {
  RawAsset,
  RawDevice,
  RawUserResponse,
  SiteTopology,
  SiloDevices,
} from '../types.js';

export async function discoverTopology(client: AgrologHttpClient): Promise<SiteTopology> {
  // Step 1: Get customer ID from current user
  const user = await client.request<RawUserResponse>('GET', API_PATHS.USER);
  const customerId = user.customerId.id;

  // Step 2: Discover site
  const sites = await client.request<RawAsset[]>('POST', API_PATHS.ASSETS, {
    assetTypes: DISCOVERY_ASSET_TYPES.SITES,
    parameters: {
      direction: 'FROM',
      maxLevel: 1,
      rootType: 'CUSTOMER',
      rootId: customerId,
    },
    relationType: 'Contains',
  });

  if (!sites || sites.length === 0) {
    throw new AgrologAPIError(
      'No sites found for this customer',
      ERROR_CODES.DISCOVERY_FAILED,
    );
  }

  const siteId = sites[0].id.id;

  // Step 3: Discover assets within the site
  const assets = await client.request<RawAsset[]>('POST', API_PATHS.ASSETS, {
    assetTypes: DISCOVERY_ASSET_TYPES.SITE_ASSETS,
    parameters: {
      direction: 'FROM',
      maxLevel: 1,
      rootType: 'ASSET',
      rootId: siteId,
    },
    relationType: 'Contains',
  });

  const silos = assets
    .filter(a => a.type === 'silo')
    .map(a => ({ assetId: a.id.id, name: a.name, type: a.type }));

  const weatherStationRaw = assets.find(a => a.type === 'weather_station');
  const weatherStation = weatherStationRaw
    ? { assetId: weatherStationRaw.id.id, name: weatherStationRaw.name, type: weatherStationRaw.type }
    : null;

  const aerators = assets
    .filter(a => a.type === 'aeration')
    .map(a => ({ assetId: a.id.id, name: a.name, type: a.type }));

  return { customerId, siteId, silos, weatherStation, aerators };
}

export async function discoverSiloDevices(
  client: AgrologHttpClient,
  siloId: string,
): Promise<SiloDevices> {
  const devices = await client.request<RawDevice[]>('POST', API_PATHS.DEVICES, {
    deviceTypes: DISCOVERY_DEVICE_TYPES.SILO,
    parameters: {
      direction: 'FROM',
      maxLevel: 1,
      rootType: 'ASSET',
      rootId: siloId,
    },
    relationType: 'Contains',
  });

  return {
    siloId,
    devices: devices.map(d => ({
      deviceId: d.id.id,
      name: d.name,
      type: d.type,
    })),
  };
}

export async function discoverWeatherDevice(
  client: AgrologHttpClient,
  weatherStationAssetId: string,
): Promise<string> {
  const devices = await client.request<RawDevice[]>('POST', API_PATHS.DEVICES, {
    deviceTypes: DISCOVERY_DEVICE_TYPES.WEATHER_STATION,
    parameters: {
      direction: 'FROM',
      maxLevel: 1,
      rootType: 'ASSET',
      rootId: weatherStationAssetId,
    },
    relationType: 'Contains',
  });

  if (!devices || devices.length === 0) {
    throw new AgrologAPIError(
      `No weather station device found for asset ${weatherStationAssetId}`,
      ERROR_CODES.DISCOVERY_FAILED,
    );
  }

  return devices[0].id.id;
}
