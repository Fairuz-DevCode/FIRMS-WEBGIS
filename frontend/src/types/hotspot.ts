export type SensorType =
  | 'VIIRS_SNPP_NRT'
  | 'VIIRS_NOAA20_NRT'
  | 'VIIRS_NOAA21_NRT'
  | 'MODIS_NRT';

/**
 * Standard column index mapping for Flat Array Matrix:
 * [lat, lng, brightness, frp, confidence, acq_date, acq_time]
 */
export const HOTSPOT_COL = {
  LAT: 0,
  LNG: 1,
  BRIGHTNESS: 2,
  FRP: 3,
  CONFIDENCE: 4,
  ACQ_DATE: 5,
  ACQ_TIME: 6,
} as const;

/**
 * Flat Array Matrix row representation for high performance streaming & rendering
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
