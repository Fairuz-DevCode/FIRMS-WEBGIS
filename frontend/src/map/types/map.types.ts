export type BasemapType = 'satellite' | 'light_gray';

export interface BasemapConfig {
  id: BasemapType;
  name: string;
  url: string;
  overlayUrl?: string;
  subdomains?: string[];
  attribution: string;
}

export interface IslandConfig {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

export interface ProvinceConfig {
  id: string;
  name: string;
  islandId: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
}

export type ResearchModule = 'PEMODELAN_KERENTANAN' | 'PENGGUNAAN_LAHAN' | 'POLA_WAKTU';
