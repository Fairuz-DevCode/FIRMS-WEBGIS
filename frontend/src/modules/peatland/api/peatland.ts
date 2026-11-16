// ==============================================================================
// CLIENT API LAHAN GAMBUT (PEATLAND API)
// ==============================================================================
// Mengelola pemanggilan data GeoJSON sebaran lahan gambut Indonesia.
// ==============================================================================

import { getApiBaseUrl } from '../../../shared/utils/api';
import { PeatlandFeatureCollection } from '../types/peatland.types';

let cachedPeatlandGeoJSON: PeatlandFeatureCollection | null = null;
let peatlandPromise: Promise<PeatlandFeatureCollection> | null = null;

export async function fetchPeatlandGeoJSON(): Promise<PeatlandFeatureCollection> {
  if (cachedPeatlandGeoJSON) return cachedPeatlandGeoJSON;
  if (!peatlandPromise) {
    const backendUrl = getApiBaseUrl();
    peatlandPromise = fetch(`${backendUrl}/api/peatland`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: Gagal memuat data sebaran lahan gambut`);
        }
        return res.json();
      })
      .then(json => {
        cachedPeatlandGeoJSON = json;
        return json;
      })
      .catch(err => {
        peatlandPromise = null;
        throw err;
      });
  }
  return peatlandPromise;
}
