/**
 * Shared base GeoJSON geometry types used across multiple modules.
 */

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface PolygonGeometry {
  type: 'Polygon';
  coordinates: number[][][];
}
