import { BasemapType, BasemapConfig } from '../types/map.types';
export type { BasemapType, BasemapConfig };

export const BASEMAPS: Record<BasemapType, BasemapConfig> = {
  satellite: {
    id: 'satellite',
    name: 'Esri World Imagery (Citra Satelit)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxNativeZoom: 18,
    maxZoom: 20
  },
  light_gray: {
    id: 'light_gray',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
    maxZoom: 20
  }
};
