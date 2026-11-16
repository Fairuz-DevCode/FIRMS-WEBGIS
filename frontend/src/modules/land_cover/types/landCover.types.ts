// BAGIAN 1: Definisi kelas atribut tutupan lahan (LULC)
export interface LandCoverClass {
  value: number;
  label: string;
  color: string;
  description: string;
}

// BAGIAN 2: Definisi penyedia layanan web service tutupan lahan
export type LandCoverProvider = 'esri_sentinel2' | 'esa_worldcover';

export interface LandCoverProviderConfig {
  id: LandCoverProvider;
  name: string;
  description: string;
  resolution: string;
  wmsUrl?: string;
  layerName?: string;
  attribution: string;
}
