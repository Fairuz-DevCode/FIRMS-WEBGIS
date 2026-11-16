// ==============================================================================
// CLIENT API IKLIM (CLIMATE API)
// ==============================================================================
// Mengelola pemanggilan data raster grid cuaca dan cache batas wilayah Indonesia.
// ==============================================================================

import { getApiBaseUrl } from '../../../shared/utils/api';
import { ClimateType } from '../types/climate.types';

// BAGIAN 1: Cache file GeoJSON batas pulau Indonesia di memori
let cachedBoundaryGeoJSON: any = null;
let boundaryPromise: Promise<any> | null = null;

export async function getBoundaryGeoJSON(): Promise<any> {
  if (cachedBoundaryGeoJSON) return cachedBoundaryGeoJSON;
  if (!boundaryPromise) {
    boundaryPromise = fetch('/indonesia_boundary.geojson')
      .then(res => res.json())
      .then(json => {
        cachedBoundaryGeoJSON = json;
        return json;
      })
      .catch(err => {
        console.warn('Gagal memuat indonesia_boundary.geojson:', err);
        return null;
      });
  }
  return boundaryPromise;
}

// BAGIAN 2: Fetch grid iklim (Curah Hujan, Kelembapan Tanah, Suhu)
export async function fetchClimateGrid(
  type: ClimateType,
  date?: string,
  limit: number = 20000
): Promise<number[][]> {
  let endpoint = type === 'rainfall' 
    ? `/api/rainfall?limit=${limit}` 
    : (type === 'soil_moisture' ? `/api/soil-moisture?limit=${limit}` : `/api/temperature?limit=${limit}`);

  if (date) {
    endpoint += `&date=${encodeURIComponent(date)}`;
  }

  const backendUrl = getApiBaseUrl();
  const res = await fetch(`${backendUrl}${endpoint}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: Gagal memuat data grid ${type}`);
  }

  const json = await res.json();
  if (json.status === 'success' && Array.isArray(json.data)) {
    return json.data;
  }
  return json.data || [];
}
