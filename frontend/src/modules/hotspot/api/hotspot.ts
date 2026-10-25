import { SensorType, HotspotMatrixRow, HotspotApiResponse } from '../../../types/hotspot';

const getBackendBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    // If running in browser and accessed through Nginx (port 3000 or standard web port)
    if (window.location.port === '3000' || !window.location.port) {
      return '';
    }
  }
  return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
};

export interface FetchHotspotsParams {
  sensor: SensorType;
  days?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  confidence?: string;
  minBrightness?: number;
  minFrp?: number;
  limit?: number;
}

export interface HotspotFetchResult {
  data: HotspotMatrixRow[];
  columns: string[];
  count: number;
  source: string;
}

/**
 * Fetches real active hotspot data from PostGIS database via backend API.
 * Supports both high-performance Flat Array Matrix and GeoJSON response format seamlessly.
 */
export async function fetchHotspots({
  sensor,
  days,
  date,
  startDate,
  endDate,
  confidence,
  minBrightness,
  minFrp,
  limit = 20000,
}: FetchHotspotsParams): Promise<HotspotFetchResult> {
  const params = new URLSearchParams();
  params.append('sensor', sensor);

  if (startDate && endDate) {
    params.append('startDate', startDate);
    params.append('endDate', endDate);
  } else if (date) {
    params.append('date', date);
  } else if (days && days > 0) {
    params.append('days', days.toString());
  }

  if (confidence) {
    params.append('confidence', confidence);
  }
  if (minBrightness !== undefined) {
    params.append('minBrightness', minBrightness.toString());
  }
  if (minFrp !== undefined) {
    params.append('minFrp', minFrp.toString());
  }
  if (limit) {
    params.append('limit', limit.toString());
  }

  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl}/api/hotspots?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
  }

  const json: any = await res.json();

  if (json.status !== 'success') {
    throw new Error(json.message || 'Gagal memuat data hotspot dari backend');
  }

  let dataMatrix: HotspotMatrixRow[] = [];

  // 1. Native Flat Array Matrix: [[lat, lng, brightness, frp, confidence, acq_date, acq_time], ...]
  if (Array.isArray(json.data)) {
    dataMatrix = json.data as HotspotMatrixRow[];
  } else if (json.data && typeof json.data === 'object' && Array.isArray(json.data.features)) {
    // 2. Compatibility Fallback: If backend returns GeoJSON FeatureCollection
    dataMatrix = json.data.features.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      return [
        Number(p.latitude ?? coords[1] ?? 0),
        Number(p.longitude ?? coords[0] ?? 0),
        p.brightness !== undefined && p.brightness !== null ? Number(p.brightness) : null,
        p.frp !== undefined && p.frp !== null ? Number(p.frp) : null,
        String(p.confidence ?? ''),
        String(p.acq_date ?? ''),
        String(p.acq_time ?? '')
      ] as HotspotMatrixRow;
    });
  } else if (Array.isArray(json.features)) {
    // 3. Direct Feature array
    dataMatrix = json.features.map((f: any) => {
      const p = f.properties || {};
      const coords = f.geometry?.coordinates || [0, 0];
      return [
        Number(p.latitude ?? coords[1] ?? 0),
        Number(p.longitude ?? coords[0] ?? 0),
        p.brightness !== undefined && p.brightness !== null ? Number(p.brightness) : null,
        p.frp !== undefined && p.frp !== null ? Number(p.frp) : null,
        String(p.confidence ?? ''),
        String(p.acq_date ?? ''),
        String(p.acq_time ?? '')
      ] as HotspotMatrixRow;
    });
  }

  return {
    data: dataMatrix,
    columns: json.columns || ['lat', 'lng', 'brightness', 'frp', 'confidence', 'acq_date', 'acq_time'],
    count: json.count ?? dataMatrix.length,
    source: json.source || 'postgresql_postgis_firms_db',
  };
}
