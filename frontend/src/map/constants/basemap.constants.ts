import { BasemapType, BasemapConfig } from '../types/map.types';
export type { BasemapType, BasemapConfig };

export const BASEMAPS: Record<BasemapType, BasemapConfig> = {
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery (Citra Satelit)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  },
  light_gray: {
    id: 'light_gray',
    name: 'Esri Light Gray Canvas (Putih Bersih)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri'
  }
};
