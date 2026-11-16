export type SensorType =
  | 'ALL'
  | 'VIIRS_SNPP_NRT'
  | 'VIIRS_NOAA20_NRT';

/**
 * Flat Array Matrix row representation for high performance streaming & rendering
 * [lat, lng, brightness, frp, confidence, acq_date, acq_time]
 */
export type HotspotMatrixRow = [
  number,        // 0: lat (Latitude)
  number,        // 1: lng (Longitude)
  number | null, // 2: brightness (Brightness temp in Kelvin)
  number | null, // 3: frp (Fire Radiative Power in MW)
  string,        // 4: confidence ('h', 'n', 'l' or numeric string)
  string,        // 5: acq_date (YYYY-MM-DD)
  string         // 6: acq_time (HHMM UTC)
];

export interface HotspotApiResponse {
  status: string;
  count: number;
  columns: string[];
  data: HotspotMatrixRow[];
  message?: string;
}

export interface HotspotMeta {
  count: number;
  source: string;
}

export interface HotspotProperties {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: string;
  acq_date: string;
  acq_time: string;
  sensor?: SensorType | string;
  satellite?: string;
  frp: number;
  daynight?: string;
}

export interface SelectedHotspotAnalytics {
  row: HotspotMatrixRow;
  sensor: string;
  isPeatland: boolean;
  province?: string;
  landCoverClass?: string;
  cluster?: {
    nearby_count: number;
    nearest_neighbor_km: number;
    radius_km: number;
  };
  rainfall?: { value: number; category: string };
  soilMoisture?: { value: number; category: string };
  temperature?: { value: number; category: string };
  loading?: boolean;
}
