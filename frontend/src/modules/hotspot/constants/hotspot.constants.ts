// BAGIAN 1: Pemetaan indeks kolom array matriks datar titik api
// Format: [lat, lng, brightness, frp, confidence, acq_date, acq_time]
export const HOTSPOT_COL = {
  LAT: 0,
  LNG: 1,
  BRIGHTNESS: 2,
  FRP: 3,
  CONFIDENCE: 4,
  ACQ_DATE: 5,
  ACQ_TIME: 6,
} as const;

// BAGIAN 2: Ambang batas klasifikasi suhu kecerahan (Brightness Kelvin kanal I4 VIIRS 375m)
export const HOTSPOT_BRIGHTNESS_THRESHOLDS = {
  LOW_MAX: 335,     // < 335 K (< 62°C) -> Sedang (Kuning/Amber)
  MED_MAX: 349,     // 335 - 349 K (62 - 76°C) -> Tinggi (Oranye)
  HIGH_MIN: 350,    // >= 350 K (>= 77°C) -> Ekstrem (Merah)
} as const;

// BAGIAN 3: Palet warna indikator intensitas titik api
export const HOTSPOT_COLORS = {
  LOW: '#f59e0b',    // Amber
  MED: '#f97316',    // Oranye
  HIGH: '#dc2626',   // Merah
  DEFAULT: '#f97316'
} as const;

// BAGIAN 4: Fungsi helper penentu kategori suhu kecerahan
export function getHotspotBrightnessCategory(brightness: number): 'low' | 'med' | 'high' {
  if (brightness >= HOTSPOT_BRIGHTNESS_THRESHOLDS.HIGH_MIN) return 'high';
  if (brightness >= HOTSPOT_BRIGHTNESS_THRESHOLDS.LOW_MAX) return 'med';
  return 'low';
}

export function getHotspotBrightnessColor(brightness: number): string {
  const category = getHotspotBrightnessCategory(brightness);
  if (category === 'high') return HOTSPOT_COLORS.HIGH;
  if (category === 'med') return HOTSPOT_COLORS.MED;
  return HOTSPOT_COLORS.LOW;
}
