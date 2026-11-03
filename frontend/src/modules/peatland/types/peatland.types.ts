import { PolygonGeometry } from '../../../shared/types/geo.types';

export interface PeatlandProperties {
  name?: string;
  namobj?: string;
  province?: string;
  depth_m?: number;
  carbon_ton_ha?: number;
  status?: string;
  shape_Area?: number | string;
  shape_Length?: number | string;
  layer_revi?: string;
}

export interface PeatlandFeature {
  type: 'Feature';
  properties: PeatlandProperties;
  geometry: PolygonGeometry;
}

export interface PeatlandFeatureCollection {
  type: 'FeatureCollection';
  features: PeatlandFeature[];
}
