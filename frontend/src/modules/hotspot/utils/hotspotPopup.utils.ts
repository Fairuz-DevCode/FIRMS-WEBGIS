// ==============================================================================
// UTILS POPUP TITIK API (HOTSPOT POPUP UTILS)
// ==============================================================================
// Menghasilkan markup HTML ringan untuk popup Leaflet marker titik api.
// ==============================================================================

import { HotspotMatrixRow } from '../types/hotspot.types';
import { HOTSPOT_COL } from '../constants/hotspot.constants';

export interface ActiveLayersContext {
  showPeatland: boolean;
  isPeatland?: boolean;
  showLandCover?: boolean;
  landCoverClass?: string;
  showRainfall: boolean;
  rainfall?: { value: number; category: string };
  showSoilMoisture: boolean;
  soilMoisture?: { value: number; category: string };
  showTemperature: boolean;
  temperature?: { value: number; category: string };
}

export function createPopupContent(
  row: HotspotMatrixRow,
  sensorName: string,
  context?: ActiveLayersContext
): string {
  const lat = row[HOTSPOT_COL.LAT];
  const lng = row[HOTSPOT_COL.LNG];
  const brightness = row[HOTSPOT_COL.BRIGHTNESS];
  const frp = row[HOTSPOT_COL.FRP];
  const acq_date = row[HOTSPOT_COL.ACQ_DATE];
  const acq_time = row[HOTSPOT_COL.ACQ_TIME];

  const isPeat = context?.isPeatland === true;
  const peatLabel = isPeat ? 'Di Dalam Gambut' : 'Di Luar Gambut';

  return `
    <div class="hotspot-popup-container" style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #475569;">
      <!-- Header -->
      <div class="hotspot-popup-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
        <span class="hotspot-popup-title" style="font-weight: 700; color: #0f172a; font-size: 12.5px;">Informasi Titik Api</span>
      </div>

      <!-- Detail Parameter -->
      <div class="hotspot-popup-rows" style="display: flex; flex-direction: column; gap: 4px;">
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Sensor / Satelit:</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${sensorName}</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Waktu Deteksi:</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${acq_date} ${acq_time} UTC</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Suhu Kecerahan:</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${brightness !== null ? `${Number(brightness).toFixed(1)} K (${Math.round(Number(brightness) - 273.15)}°C)` : 'N/A'}</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Kekuatan Api (FRP):</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${frp !== null ? Number(frp).toFixed(1) + ' MW' : 'N/A'}</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Koordinat:</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Status Lahan Gambut:</span>
          <strong class="hotspot-popup-val" style="color: #1e293b;">${peatLabel}</strong>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px; gap: 8px;">
          <span class="hotspot-popup-label" style="color: #64748b; white-space: nowrap; flex-shrink: 0;">Tutupan Lahan:</span>
          <div style="text-align: right; max-width: 140px; word-break: break-word;">
            ${(() => {
              const text = context?.landCoverClass || 'Memuat...';
              if (text.includes(' / ')) {
                const parts = text.split(' / ');
                return `<strong class="hotspot-popup-val" style="color: #1e293b; display: block; line-height: 1.2;">${parts[0]}</strong><div class="hotspot-popup-sub" style="font-size: 9.5px; color: #64748b; font-weight: 500; margin-top: 1px;">${parts.slice(1).join(' / ')}</div>`;
              }
              return `<strong class="hotspot-popup-val" style="color: #1e293b; display: block; line-height: 1.2;">${text}</strong>`;
            })()}
          </div>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Curah Hujan:</span>
          <div style="text-align: right; line-height: 1.2;">
            <strong class="hotspot-popup-val" style="color: #1e293b;">${context?.rainfall ? `${context.rainfall.value} mm` : 'Memuat...'}</strong>
            ${context?.rainfall?.category ? `<div class="hotspot-popup-sub" style="font-size: 9.5px; color: #64748b; font-weight: 500;">${context.rainfall.category}</div>` : ''}
          </div>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 3px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Kelembaban Tanah:</span>
          <div style="text-align: right; line-height: 1.2;">
            <strong class="hotspot-popup-val" style="color: #1e293b;">${context?.soilMoisture ? `${context.soilMoisture.value} m³/m³` : 'Memuat...'}</strong>
            ${context?.soilMoisture?.category ? `<div class="hotspot-popup-sub" style="font-size: 9.5px; color: #64748b; font-weight: 500;">${context.soilMoisture.category}</div>` : ''}
          </div>
        </div>
        <div class="hotspot-popup-row" style="display: flex; justify-content: space-between; padding-bottom: 1px;">
          <span class="hotspot-popup-label" style="color: #64748b;">Suhu Udara:</span>
          <div style="text-align: right; line-height: 1.2;">
            <strong class="hotspot-popup-val" style="color: #1e293b;">${context?.temperature ? `${context.temperature.value} °C` : 'Memuat...'}</strong>
            ${context?.temperature?.category ? `<div class="hotspot-popup-sub" style="font-size: 9.5px; color: #64748b; font-weight: 500;">${context.temperature.category}</div>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}
