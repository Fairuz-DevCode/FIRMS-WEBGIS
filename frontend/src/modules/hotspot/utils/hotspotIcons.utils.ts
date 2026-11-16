// ==============================================================================
// UTILS IKON DAN STYLING TITIK API (HOTSPOT ICONS UTILS)
// ==============================================================================
// Mengelola pembuatan ikon api DivIcon, ikon klaster supercluster, dan warna suhu.
// ==============================================================================

import L from 'leaflet';
import { HotspotMatrixRow } from '../types/hotspot.types';
import { HOTSPOT_COL } from '../constants/hotspot.constants';

export interface HotspotStyle {
  color: string;
  fillColor: string;
  level: 'high' | 'nominal' | 'low';
  radius: number;
}

/**
 * Palet warna titik api dan klaster berdasarkan suhu kecerahan:
 * - >= 350 K (>= 77°C): Merah (Ekstrem)
 * - 335 K - 349 K (62°C - 76°C): Oranye (Tinggi)
 * - < 335 K (< 62°C): Kuning Amber (Sedang)
 */
export function getTemperatureColor(tempKelvin: number): {
  bg: string;
  borderColor: string;
  level: 'high' | 'nominal' | 'low';
  celsius: number;
} {
  const celsius = Math.round(tempKelvin - 273.15);
  if (tempKelvin >= 350) {
    return { bg: '#dc2626', borderColor: '#fca5a5', level: 'high', celsius };
  } else if (tempKelvin >= 335) {
    return { bg: '#ea580c', borderColor: '#fdba74', level: 'nominal', celsius };
  } else {
    return { bg: '#f59e0b', borderColor: '#fde68a', level: 'low', celsius };
  }
}

/**
 * Menentukan warna dan ukuran marker individual berdasarkan suhu kecerahan (Kelvin/Celsius).
 */
export function getHotspotStyleFromRow(row: HotspotMatrixRow): HotspotStyle {
  const bright = Number(row[HOTSPOT_COL.BRIGHTNESS]) || 325;
  const frp = Number(row[HOTSPOT_COL.FRP]) || 0;
  const { bg, borderColor, level } = getTemperatureColor(bright);

  const radius = Math.min(Math.max(4 + (frp || 0) / 35, 4.5), 9);
  return { color: borderColor, fillColor: bg, level, radius };
}

export function getHotspotStyle(props: any): HotspotStyle {
  if (Array.isArray(props)) {
    return getHotspotStyleFromRow(props as HotspotMatrixRow);
  }
  return getHotspotStyleFromRow([
    props.latitude ?? 0,
    props.longitude ?? 0,
    props.brightness ?? 0,
    props.frp ?? 0,
    props.confidence ?? '',
    props.acq_date ?? '',
    props.acq_time ?? ''
  ]);
}

/**
 * Membuat badge cluster dengan warna berdasarkan rata-rata suhu kecerahan titik di dalam cluster.
 */
export function createClusterIcon(count: number, avgBrightness: number = 330): L.DivIcon {
  const { bg, borderColor, celsius } = getTemperatureColor(avgBrightness);
  let size = 34;

  if (count >= 1000) {
    size = 46;
  } else if (count >= 100) {
    size = 40;
  } else if (count >= 30) {
    size = 36;
  }

  const formatted = count >= 1000 ? (count / 1000).toFixed(1) + 'k' : String(count);

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
        font-weight: 800;
        font-size: ${size >= 40 ? '12px' : '11px'};
        color: #ffffff;
        background: ${bg};
        border: 2.5px solid ${borderColor};
        box-shadow: 0 3px 10px rgba(0,0,0,0.38);
        transform: translate3d(0, 0, 0);
        will-change: transform;
        cursor: pointer;
        user-select: none;
      "
      title="Klaster: ${count.toLocaleString()} titik api | Rata-rata Suhu: ${avgBrightness.toFixed(1)} K (${celsius}°C)">
        ${formatted}
      </div>
    `,
    className: 'hotspot-cluster-badge',
    iconSize: L.point(size, size, true),
    iconAnchor: L.point(size / 2, size / 2)
  });
}

/**
 * Icon Api DivIcon untuk titik api individual.
 */
export function createHotspotFireIcon(row: HotspotMatrixRow): L.DivIcon {
  const brightness = row[HOTSPOT_COL.BRIGHTNESS] || 325;
  const { bg } = getTemperatureColor(brightness);
  const celsius = Math.round(brightness - 273.15);

  return L.divIcon({
    html: `
      <div class="hotspot-fire-marker" style="
        width: 24px;
        height: 26px;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.65));
        cursor: pointer;
        transform: translate3d(0, 0, 0);
      "
      title="Titik Api: ${brightness.toFixed(1)} K (${celsius}°C)">
        <svg width="22" height="24" viewBox="0 0 24 24" fill="${bg}" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
        </svg>
      </div>
    `,
    className: 'hotspot-fire-div-icon',
    iconSize: L.point(24, 26, true),
    iconAnchor: L.point(12, 22),
    popupAnchor: L.point(0, -20)
  });
}
