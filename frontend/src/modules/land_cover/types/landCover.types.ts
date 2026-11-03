export interface LandCoverClass {
  value: number;
  label: string;
  color: string;
  description: string;
}

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
