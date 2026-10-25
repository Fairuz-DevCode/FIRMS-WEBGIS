/**
 * Spatial Utilities for Point-in-Polygon checks & GeoJSON filtering
 */

export interface BoundingBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface PreparedPolygon {
  bbox: BoundingBox;
  type: 'Polygon' | 'MultiPolygon';
  coordinates: any;
}

/**
 * Fast Ray-casting algorithm to test if point [x=lng, y=lat] is inside a polygon ring
 */
function isPointInRing(point: [number, number], ring: number[][]): boolean {
  const x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Pre-indexes Peatland GeoJSON features with bounding boxes for ultra-fast spatial querying
 */
export function preparePeatlandPolygons(peatlandGeoJSON: any): PreparedPolygon[] {
  if (!peatlandGeoJSON || !Array.isArray(peatlandGeoJSON.features)) return [];

  const prepared: PreparedPolygon[] = [];

  for (const feature of peatlandGeoJSON.features) {
    const geom = feature.geometry;
    if (!geom || !geom.coordinates) continue;

    let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;

    const processRing = (ring: number[][]) => {
      for (const pt of ring) {
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
      }
    };

    if (geom.type === 'Polygon') {
      for (const ring of geom.coordinates) processRing(ring);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        for (const ring of poly) processRing(ring);
      }
    }

    if (minLng !== Infinity) {
      prepared.push({
        bbox: { minLng, minLat, maxLng, maxLat },
        type: geom.type,
        coordinates: geom.coordinates,
      });
    }
  }

  return prepared;
}

/**
 * Checks if a point [lng, lat] is inside any prepared peatland polygon
 */
export function isPointInPeatlands(lng: number, lat: number, preparedPolygons: PreparedPolygon[]): boolean {
  for (let p = 0; p < preparedPolygons.length; p++) {
    const poly = preparedPolygons[p];
    const bbox = poly.bbox;

    // Fast bounding box check
    if (lng < bbox.minLng || lng > bbox.maxLng || lat < bbox.minLat || lat > bbox.maxLat) {
      continue;
    }

    // Exact geometry check
    if (poly.type === 'Polygon') {
      if (isPointInRing([lng, lat], poly.coordinates[0])) return true;
    } else if (poly.type === 'MultiPolygon') {
      for (let s = 0; s < poly.coordinates.length; s++) {
        if (isPointInRing([lng, lat], poly.coordinates[s][0])) return true;
      }
    }
  }

  return false;
}
