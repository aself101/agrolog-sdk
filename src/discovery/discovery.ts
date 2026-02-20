import type { AgrologHttpClient } from '../http/http-client.js';
import { API_PATHS, DISCOVERY_ASSET_TYPES, DISCOVERY_DEVICE_TYPES, ERROR_CODES } from '../config/constants.js';
import { AgrologAPIError } from '../errors.js';
import type { RawAsset, RawDevice, RawUserResponse } from '../types-internal.js';
import type { SiteTopology, SiloDevices } from '../types.js';

/** Build a ThingsBoard "Contains" relation query body. */
function buildContainsQuery(rootType: string, rootId: string) {
  return {
    parameters: { direction: 'FROM' as const, maxLevel: 1, rootType, rootId },
    relationType: 'Contains',
  };
}

/** Map a raw ThingsBoard asset to a typed asset record. */
function mapAsset(a: RawAsset) {
  return { assetId: a.id.id, name: a.name, type: a.type };
}

export async function discoverTopology(client: AgrologHttpClient): Promise<SiteTopology> {
  // Step 1: Get customer ID from current user
  const user = await client.request<RawUserResponse>('GET', API_PATHS.USER);
  const customerId = user.customerId.id;

  // Step 2: Discover site
  const sites = await client.request<RawAsset[]>('POST', API_PATHS.ASSETS, {
    assetTypes: DISCOVERY_ASSET_TYPES.SITES,
    ...buildContainsQuery('CUSTOMER', customerId),
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
    ...buildContainsQuery('ASSET', siteId),
  });

  const silos = assets.filter(a => a.type === 'silo').map(mapAsset);
  const weatherStationRaw = assets.find(a => a.type === 'weather_station');
  const weatherStation = weatherStationRaw ? mapAsset(weatherStationRaw) : null;
  const aerators = assets.filter(a => a.type === 'aeration').map(mapAsset);

  return { customerId, siteId, silos, weatherStation, aerators };
}

export async function discoverSiloDevices(
  client: AgrologHttpClient,
  siloId: string,
): Promise<SiloDevices> {
  const devices = await client.request<RawDevice[]>('POST', API_PATHS.DEVICES, {
    deviceTypes: DISCOVERY_DEVICE_TYPES.SILO,
    ...buildContainsQuery('ASSET', siloId),
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
    ...buildContainsQuery('ASSET', weatherStationAssetId),
  });

  if (!devices || devices.length === 0) {
    throw new AgrologAPIError(
      `No weather station device found for asset ${weatherStationAssetId}`,
      ERROR_CODES.DISCOVERY_FAILED,
    );
  }

  return devices[0].id.id;
}
