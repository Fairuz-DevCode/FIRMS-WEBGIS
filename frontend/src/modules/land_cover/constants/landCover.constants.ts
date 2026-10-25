export interface LandCoverClass {
  value: number;
  label: string;
  color: string;
  description: string;
}

export const ESRI_LAND_COVER_CLASSES: Record<number, LandCoverClass> = {
  1: {
    value: 1,
    label: 'Air / Badan Air',
    color: '#1A5EDF',
    description: 'Sungai, danau, lautan, reservoir, dan perairan terbuka',
  },
  2: {
    value: 2,
    label: 'Hutan / Pepohonan',
    color: '#358221',
    description: 'Hutan primer, sekunder, kanopi rapat > 15m',
  },
  4: {
    value: 4,
    label: 'Rawa / Gambut / Vegetasi Tergenang',
    color: '#7A8EF5',
    description: 'Lahan basah tergenang air, hutan rawa gambut, mangrove',
  },
  5: {
    value: 5,
    label: 'Pertanian / Perkebunan',
    color: '#EDD36C',
    description: 'Lahan sawah, kebun kelapa sawit, jagung, dan tanaman pangan',
  },
  7: {
    value: 7,
    label: 'Pemukiman / Infrastruktur',
    color: '#ED022A',
    description: 'Kota, gedung, perkampungan, jalan asphalt, dan struktur buatan',
  },
  8: {
    value: 8,
    label: 'Tanah Terbuka / Berpasir',
    color: '#A28A5E',
    description: 'Tanah gundul, pasir pantai, area pertambangan, batuan',
  },
  9: {
    value: 9,
    label: 'Salju / Es',
    color: '#F2F2F2',
    description: 'Puncak es dan tutupan salju permanen',
  },
  10: {
    value: 10,
    label: 'Awan / Bayangan',
    color: '#C8C8C8',
    description: 'Tutupan awan satelit saat pencitraan',
  },
  11: {
    value: 11,
    label: 'Semak Belukar / Padang Rumput',
    color: '#88B053',
    description: 'Semak belukar, rangeland, savanna, dan rumput liat',
  },
};

export type LandCoverProvider = 'esri_sentinel2' | 'esa_worldcover' | 'local_geotiff';

export interface LandCoverProviderConfig {
  id: LandCoverProvider;
  name: string;
  description: string;
  resolution: string;
  wmsUrl?: string;
  layerName?: string;
  attribution: string;
}

export const LAND_COVER_PROVIDERS: Record<LandCoverProvider, LandCoverProviderConfig> = {
  esri_sentinel2: {
    id: 'esri_sentinel2',
    name: 'Esri Sentinel-2 10m LULC (Live Web Service)',
    description: 'Layanan GIS ArcGIS Web Tile 10m tanpa download database',
    resolution: '10 Meter',
    wmsUrl: 'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/WMSServer',
    layerName: 'Sentinel2_10m_LandCover',
    attribution: 'Esri, Impact Observatory, Microsoft',
  },
  esa_worldcover: {
    id: 'esa_worldcover',
    name: 'ESA WorldCover 10m (Sentinel-1 & 2)',
    description: 'Peta tutupan lahan global 10m dari European Space Agency',
    resolution: '10 Meter',
    wmsUrl: 'https://services.terrascope.be/wms/v2',
    layerName: 'WORLDCOVER_2021_MAP',
    attribution: 'ESA WorldCover / Terrascope',
  },
  local_geotiff: {
    id: 'local_geotiff',
    name: 'Unggah / Olah File GeoTIFF (.tif) Langsung di Browser',
    description: 'Parsing array GeoTIFF rasters client-side tanpa kirim ke database PostGIS',
    resolution: 'Dynamic',
    attribution: 'Custom User GeoTIFF Client-Side Parser',
  },
};
