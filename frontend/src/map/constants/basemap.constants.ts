export type BasemapType =
  | 'satellite'
  | 'light_gray';

export interface BasemapConfig {
  id: BasemapType;
  name: string;
  url: string;
  overlayUrl?: string;
  subdomains?: string[];
  attribution: string;
}

export const BASEMAPS: Record<BasemapType, BasemapConfig> = {
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery (Citra Satelit)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
  },
  light_gray: {
    id: 'light_gray',
    name: 'Esri Light Gray Canvas (Putih Bersih)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
  }
};
