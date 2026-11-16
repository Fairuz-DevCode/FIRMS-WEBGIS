// ==============================================================================
// CLIENT API TITIK API (HOTSPOT API)
// ==============================================================================
// Memanggil endpoint backend /api/hotspots dan memparsing matriks titik api.
// ==============================================================================

import { SensorType, HotspotMatrixRow } from '../types/hotspot.types';
import { getApiBaseUrl } from '../../../shared/utils/api';

const getBackendBaseUrl = getApiBaseUrl;

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
  // BAGIAN 1: Susun parameter query URL
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

  // BAGIAN 2: Fetch HTTP ke backend API
  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl}/api/hotspots?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${errorText || res.statusText}`);
  }

  const json: any = await res.json();
  if (json.status !== 'success') {
    throw new Error(json.message || 'Gagal memuat data hotspot');
  }

  // BAGIAN 3: Ekstraksi data matriks 2D
  let dataMatrix: HotspotMatrixRow[] = [];

  if (Array.isArray(json.data)) {
    dataMatrix = json.data as HotspotMatrixRow[];
  } else if (json.data && typeof json.data === 'object' && Array.isArray(json.data.features)) {
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

  // BAGIAN 4: Kembalikan format hasil standar
  return {
    data: dataMatrix,
    columns: json.columns || ['lat', 'lng', 'brightness', 'frp', 'confidence', 'acq_date', 'acq_time'],
    count: json.count ?? dataMatrix.length,
    source: json.source || 'postgresql_postgis_firms_db',
  };
}
