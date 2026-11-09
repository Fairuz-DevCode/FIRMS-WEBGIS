import React, { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster, { PointFeature, ClusterProperties } from 'supercluster';

// Ensure global window.L exists for leaflet.heat in ES Module bundlers
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';

import { HotspotMatrixRow, SensorType, HOTSPOT_COL, SelectedHotspotAnalytics } from '../types/hotspot.types';
import { useHotspots } from '../hooks/useHotspots';
import { getHotspotSatellite } from './SatelliteStatsWidget';
import { isPointInPeatlands } from '../../../shared/utils/spatial.utils';

export interface HotspotStyle {
  color: string;
  fillColor: string;
  level: 'high' | 'nominal' | 'low';
  radius: number;
}

/**
 * Palet Warna Titik Api & Klaster Berdasarkan Suhu Kecerahan (Tanpa Warna Hijau):
 * Karena titik api adalah potensi kebakaran/bencana, warna menggunakan tema api murni:
 * - >= 350 K (>= 77°C) : 🔴 Merah Pekat / Ekstrem (Darurat)
 * - 335 K - 349 K (62°C - 76°C) : 🟠 Oranye Pekat (Tinggi)
 * - 325 K - 334 K (52°C - 61°C) : 🟡 Amber / Oranye Cerah (Sedang)
 * - < 325 K (< 52°C)   : 🟡 Kuning Emas (Waspada / Awal)
 */
export function getTemperatureColor(tempKelvin: number): {
  bg: string;
  borderColor: string;
  level: 'high' | 'nominal' | 'low';
  celsius: number;
} {
  const celsius = Math.round(tempKelvin - 273.15);
  if (tempKelvin >= 350) {
    return { bg: '#dc2626', borderColor: '#fca5a5', level: 'high', celsius };   // Merah Ekstrem
  } else if (tempKelvin >= 335) {
    return { bg: '#ea580c', borderColor: '#fdba74', level: 'high', celsius };   // Oranye Pekat
  } else if (tempKelvin >= 325) {
    return { bg: '#f59e0b', borderColor: '#fde68a', level: 'nominal', celsius }; // Amber
  } else {
    return { bg: '#eab308', borderColor: '#fef08a', level: 'low', celsius };     // Kuning Emas
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
 * Creates lightweight HTML markup for the marker popup.
 */
import { ESRI_LAND_COVER_CLASSES } from '../../land_cover/constants/landCover.constants';

export interface ActiveLayersContext {
  showPeatland: boolean;
  isPeatland?: boolean;
  showLandCover: boolean;
  landCoverClass?: string;
  showRainfall: boolean;
  rainfall?: { value: number; category: string };
  showSoilMoisture: boolean;
  soilMoisture?: { value: number; category: string };
  showTemperature: boolean;
  temperature?: { value: number; category: string };
}

/**
 * Creates lightweight HTML markup for the marker popup.
 * Dynamically includes peatland status and active environmental layers.
 */
function createPopupContent(
  row: HotspotMatrixRow,
  sensorName: string,
  context?: ActiveLayersContext
): string {
  const lat = row[HOTSPOT_COL.LAT];
  const lng = row[HOTSPOT_COL.LNG];
  const brightness = row[HOTSPOT_COL.BRIGHTNESS];
  const frp = row[HOTSPOT_COL.FRP];
  const confidence = row[HOTSPOT_COL.CONFIDENCE];
  const acq_date = row[HOTSPOT_COL.ACQ_DATE];
  const acq_time = row[HOTSPOT_COL.ACQ_TIME];

  const conf = String(confidence || '').toLowerCase();
  let badgeBg = '#dcfce7';
  let badgeColor = '#15803d';
  let badgeBorder = '#86efac';

  if (conf === 'high' || conf === 'h' || Number(conf) >= 80) {
    badgeBg = '#fee2e2';
    badgeColor = '#b91c1c';
    badgeBorder = '#fca5a5';
  } else if (conf === 'nominal' || conf === 'n' || (Number(conf) >= 30 && Number(conf) < 80)) {
    badgeBg = '#fef9c3';
    badgeColor = '#a16207';
    badgeBorder = '#fde047';
  }

  // Peatland status badge
  const isPeat = context?.isPeatland === true;
  const peatLabel = isPeat ? 'Di Dalam Gambut' : 'Di Luar Gambut';

  return `
    <div class="hotspot-popup-container" style="font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #475569;">
      <!-- Header -->
      <div class="hotspot-popup-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
        <span class="hotspot-popup-title" style="font-weight: 700; color: #0f172a; font-size: 12.5px;">Informasi Titik Api</span>
        <span class="hotspot-popup-badge" style="font-weight: 700; font-size: 9.5px; text-transform: uppercase; padding: 1.5px 6px; border-radius: 5px; border: 1px solid ${badgeBorder}; background: ${badgeBg}; color: ${badgeColor};">
          ${confidence || 'N/A'}
        </span>
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

/**
 * Membuat badge cluster dengan warna berdasarkan RATA-RATA SUHU KECERAHAN titik di dalam cluster.
 * - Rata-rata Suhu Ekstrem (>= 355 K / >= 82°C): Merah (#dc2626)
 * - Rata-rata Suhu Tinggi (340 K - 354 K / 67°C - 81°C): Oranye (#ea580c)
 * - Rata-rata Suhu Sedang (325 K - 339 K / 52°C - 66°C): Kuning (#eab308)
 * - Rata-rata Suhu Rendah (< 325 K / < 52°C): Hijau (#16a34a)
 */
function createClusterIcon(count: number, avgBrightness: number = 330): L.DivIcon {
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

interface HotspotFeatureProperties {
  lat: number;
  lng: number;
  brightness: number | null;
  frp: number | null;
  confidence: string;
  acq_date: string;
  acq_time: string;
  rawRow: HotspotMatrixRow;
}

interface HotspotClusterProperties {
  sumBrightness: number;
}

/**
 * Heatmap overlay with Viewport Culling.
 */
function HeatmapOverlay({ hotspots }: { hotspots: HotspotMatrixRow[] }) {
  const map = useMap();

  useEffect(() => {
    if (!map || hotspots.length === 0) return;

    const heatFn = (L as any).heatLayer || (window as any).L?.heatLayer;
    if (typeof heatFn !== 'function') return;

    let heatLayer: any = null;

    const updateHeatmap = () => {
      const bounds = map.getBounds();
      const lngPad = (bounds.getEast() - bounds.getWest()) * 0.2;
      const latPad = (bounds.getNorth() - bounds.getSouth()) * 0.2;
      const minLng = bounds.getWest() - lngPad;
      const maxLng = bounds.getEast() + lngPad;
      const minLat = bounds.getSouth() - latPad;
      const maxLat = bounds.getNorth() + latPad;

      const points: Array<[number, number, number]> = [];
      const len = hotspots.length;

      for (let i = 0; i < len; i++) {
        const row = hotspots[i];
        const lat = row[HOTSPOT_COL.LAT];
        const lng = row[HOTSPOT_COL.LNG];
        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) continue;

        if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
          const frp = row[HOTSPOT_COL.FRP] || 10;
          const intensity = Math.min(Math.max(frp / 100, 0.2), 1.0);
          points.push([lat, lng, intensity]);
        }
      }

      if (!heatLayer) {
        heatLayer = heatFn(points, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          gradient: {
            0.3: '#22c55e',  // Green (Low)
            0.65: '#eab308', // Yellow (Medium)
            1.0: '#dc2626'   // Red (High)
          }
        });
        heatLayer.addTo(map);
      } else {
        heatLayer.setLatLngs(points);
      }
    };

    updateHeatmap();
    map.on('moveend zoomend', updateHeatmap);

    return () => {
      map.off('moveend zoomend', updateHeatmap);
      if (heatLayer) map.removeLayer(heatLayer);
    };
  }, [map, hotspots]);

  return null;
}

import { getApiBaseUrl } from '../../../shared/utils/api';

interface HotspotLayerProps {
  sensor?: SensorType;
  days?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  mode?: 'markers' | 'heatmap';
  features?: HotspotMatrixRow[];
  onHotspotData?: (data: HotspotMatrixRow[]) => void;
  activeContext?: ActiveLayersContext;
  peatlandPolygons?: any[];
  onSelectHotspot?: (analytics: SelectedHotspotAnalytics | null) => void;
}

export default function HotspotLayer({
  sensor = 'VIIRS_SNPP_NRT',
  days = 30,
  date,
  startDate,
  endDate,
  mode = 'markers',
  features,
  onHotspotData,
  activeContext,
  peatlandPolygons = [],
  onSelectHotspot
}: HotspotLayerProps) {
  const { hotspots: fetchedHotspots, loading, error } = useHotspots(sensor, days, date, startDate, endDate);
  const map = useMap();

  // Notify parent once fetched without triggering render loops
  const lastSyncedRef = useRef<HotspotMatrixRow[] | null>(null);
  useEffect(() => {
    if (!loading && !error && onHotspotData && fetchedHotspots !== lastSyncedRef.current) {
      lastSyncedRef.current = fetchedHotspots;
      onHotspotData(fetchedHotspots);
    }
  }, [fetchedHotspots, loading, error, onHotspotData]);

  const activeHotspots = features !== undefined ? features : fetchedHotspots;

  // 1. Build Supercluster with balanced regional radius (95px)
  // Prevents hundreds of micro-clusters and combines them cleanly
  const superclusterIndex = useMemo(() => {
    if (!activeHotspots || activeHotspots.length === 0) return null;

    const index = new Supercluster<HotspotFeatureProperties, HotspotClusterProperties>({
      radius: 95,     // Regional radius to ensure 20-40 clean clusters across Indonesia
      maxZoom: 16,    // Stop clustering after zoom 16
      minPoints: 2,
      map: (props) => ({
        sumBrightness: Number(props.brightness) || 325
      }),
      reduce: (accumulated, props) => {
        accumulated.sumBrightness += props.sumBrightness;
      }
    });

    const points: Array<PointFeature<HotspotFeatureProperties>> = [];
    const len = activeHotspots.length;

    for (let i = 0; i < len; i++) {
      const row = activeHotspots[i];
      const lat = row[HOTSPOT_COL.LAT];
      const lng = row[HOTSPOT_COL.LNG];
      if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) continue;

      points.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          lat,
          lng,
          brightness: row[HOTSPOT_COL.BRIGHTNESS],
          frp: row[HOTSPOT_COL.FRP],
          confidence: row[HOTSPOT_COL.CONFIDENCE],
          acq_date: row[HOTSPOT_COL.ACQ_DATE],
          acq_time: row[HOTSPOT_COL.ACQ_TIME],
          rawRow: row
        }
      });
    }

    index.load(points);
    return index;
  }, [activeHotspots]);

  // 2. High-Performance Render Loop with Marker Reconciliation / Diffing
  // Avoids destroying and recreating hundreds of DOM markers on pan/zoom!
  useEffect(() => {
    if (!map || mode !== 'markers' || !superclusterIndex) return;

    const hotspotPaneName = map.getPane('hotspotPane') ? 'hotspotPane' : 'markerPane';
    const layerGroup = L.layerGroup().addTo(map);
    const canvasRenderer = L.canvas({ padding: 0.3, pane: hotspotPaneName });

    // Track active markers by unique key: Map<key, L.Layer>
    const renderedMarkers = new Map<string, L.Layer>();

    const updateClusters = () => {
      // Do not update while map is actively executing CSS zoom animation
      if ((map as any)._animatingZoom) return;

      const bounds = map.getBounds();
      // Viewport culling with 15% safety buffer to eliminate edge pop-in
      const lngPad = (bounds.getEast() - bounds.getWest()) * 0.15;
      const latPad = (bounds.getNorth() - bounds.getSouth()) * 0.15;

      const west = Math.max(-180, bounds.getWest() - lngPad);
      const south = Math.max(-90, bounds.getSouth() - latPad);
      const east = Math.min(180, bounds.getEast() + lngPad);
      const north = Math.min(90, bounds.getNorth() + latPad);

      const zoom = Math.floor(map.getZoom());
      const visibleFeatures = superclusterIndex.getClusters([west, south, east, north], zoom);

      const currentKeys = new Set<string>();
      const count = visibleFeatures.length;

      for (let i = 0; i < count; i++) {
        const feat = visibleFeatures[i];
        const [lng, lat] = feat.geometry.coordinates;

        const isCluster = Boolean(feat.properties && 'cluster' in feat.properties && feat.properties.cluster === true);
        const clusterProps = isCluster ? (feat.properties as unknown as ClusterProperties) : null;
        const leafProps = !isCluster ? (feat.properties as unknown as HotspotFeatureProperties) : null;

        const key = isCluster && clusterProps
          ? `c_${clusterProps.cluster_id}`
          : `p_${leafProps?.lat}_${leafProps?.lng}`;

        currentKeys.add(key);

        // If marker is already rendered on screen, DO NOT touch it!
        if (renderedMarkers.has(key)) {
          continue;
        }

        // Only create new markers for elements newly entering viewport or after zoom
        if (isCluster && clusterProps) {
          const clusterId = clusterProps.cluster_id;
          const pointCount = clusterProps.point_count;
          const sumBright = (clusterProps as any).sumBrightness ?? (325 * pointCount);
          const avgBrightness = pointCount > 0 ? (sumBright / pointCount) : 325;
          const icon = createClusterIcon(pointCount, avgBrightness);

          const clusterMarker = L.marker([lat, lng], {
            icon,
            pane: hotspotPaneName
          });
          clusterMarker.on('click', () => {
            const nextZoom = superclusterIndex.getClusterExpansionZoom(clusterId);
            map.flyTo([lat, lng], Math.min(nextZoom, 17), { duration: 0.5 });
          });

          layerGroup.addLayer(clusterMarker);
          renderedMarkers.set(key, clusterMarker);
        } else if (leafProps) {
          const style = getHotspotStyleFromRow(leafProps.rawRow);

          const isPeat = peatlandPolygons && peatlandPolygons.length > 0
            ? isPointInPeatlands(lng, lat, peatlandPolygons)
            : false;

          const baseContext: ActiveLayersContext = {
            ...(activeContext || {
              showPeatland: true,
              showLandCover: false,
              showRainfall: false,
              showSoilMoisture: false,
              showTemperature: false
            }),
            isPeatland: isPeat
          };

          const circleMarker = L.circleMarker([lat, lng], {
            radius: style.radius,
            color: style.color,
            fillColor: style.fillColor,
            fillOpacity: 0.88,
            weight: 1.5,
            pane: hotspotPaneName,
            renderer: canvasRenderer
          });

          const satLabel = sensor === 'ALL'
            ? (getHotspotSatellite(leafProps.rawRow) === 'NOAA20' ? 'VIIRS NOAA-20 (375m)' : 'VIIRS S-NPP (375m)')
            : sensor === 'VIIRS_NOAA20_NRT'
              ? 'VIIRS NOAA-20 (375m)'
              : 'VIIRS S-NPP (375m)';

          circleMarker.bindPopup(() => createPopupContent(leafProps.rawRow, satLabel, baseContext), {
            maxWidth: 280,
            className: 'hotspot-leaflet-popup'
          });

          // Dynamic asynchronous fetch when clicked: open sidebar & query environmental & land cover context
          circleMarker.on('click', async () => {
            if (onSelectHotspot) {
              onSelectHotspot({
                row: leafProps.rawRow,
                sensor,
                isPeatland: isPeat,
                loading: true
              });
            }

            try {
              const backendUrl = getApiBaseUrl();
              const targetDate = leafProps.rawRow[HOTSPOT_COL.ACQ_DATE] || '';

              // 1. Fetch climate, peatland, and spatial cluster context from backend PostGIS (Super Fast ~10ms)
              const climateData = await fetch(`${backendUrl}/api/hotspots/context?lat=${lat}&lng=${lng}&date=${targetDate}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null);

              const isPointPeat = climateData?.is_peatland ?? isPeat;
              const pointRainfall = climateData?.rainfall ? { value: climateData.rainfall.value, category: climateData.rainfall.category } : undefined;
              const pointSoilMoisture = climateData?.soil_moisture ? { value: climateData.soil_moisture.value, category: climateData.soil_moisture.category } : undefined;
              const pointTemperature = climateData?.temperature ? { value: climateData.temperature.value, category: climateData.temperature.category } : undefined;

              // Immediately update popup & sidebar so the user doesn't wait for external Esri
              let currentContext: ActiveLayersContext = {
                ...baseContext,
                isPeatland: isPointPeat,
                landCoverClass: baseContext.landCoverClass || 'Vegetasi / Lahan Terbuka',
                rainfall: pointRainfall,
                soilMoisture: pointSoilMoisture,
                temperature: pointTemperature,
              };

              circleMarker.setPopupContent(createPopupContent(leafProps.rawRow, sensor, currentContext));

              if (onSelectHotspot) {
                onSelectHotspot({
                  row: leafProps.rawRow,
                  sensor,
                  isPeatland: isPointPeat,
                  province: climateData?.province || 'Indonesia',
                  landCoverClass: currentContext.landCoverClass,
                  cluster: climateData?.cluster,
                  rainfall: pointRainfall,
                  soilMoisture: pointSoilMoisture,
                  temperature: pointTemperature,
                  loading: false
                });
              }

              // 2. Query Esri Sentinel-2 in the background with a 3.5s timeout (Non-blocking)
              const esriIdentifyUrl = `https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/identify?geometry=%7Bx%3A${lng}%2Cy%3A${lat}%2CspatialReference%3A%7Bwkid%3A4326%7D%7D&geometryType=esriGeometryPoint&f=json`;
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 3500);

              fetch(esriIdentifyUrl, { signal: controller.signal })
                .then(r => r.ok ? r.json() : null)
                .then(landCoverData => {
                  clearTimeout(timeoutId);
                  if (landCoverData && landCoverData.value) {
                    const valNum = parseInt(String(landCoverData.value), 10);
                    let detectedLandCover: string | undefined = undefined;
                    if (ESRI_LAND_COVER_CLASSES[valNum]) {
                      detectedLandCover = ESRI_LAND_COVER_CLASSES[valNum].label;
                    } else if (landCoverData.value !== 'NoData') {
                      detectedLandCover = `Kelas ${landCoverData.value}`;
                    }

                    if (detectedLandCover) {
                      currentContext = {
                        ...currentContext,
                        landCoverClass: detectedLandCover
                      };
                      circleMarker.setPopupContent(createPopupContent(leafProps.rawRow, sensor, currentContext));
                      if (onSelectHotspot) {
                        onSelectHotspot({
                          row: leafProps.rawRow,
                          sensor,
                          isPeatland: isPointPeat,
                          province: climateData?.province || 'Indonesia',
                          landCoverClass: detectedLandCover,
                          cluster: climateData?.cluster,
                          rainfall: pointRainfall,
                          soilMoisture: pointSoilMoisture,
                          temperature: pointTemperature,
                          loading: false
                        });
                      }
                    }
                  }
                })
                .catch(() => {
                  // Silently ignore Esri timeout or network failure
                });
            } catch (e) {
              console.warn('[HotspotLayer] Context fetch error:', e);
              if (onSelectHotspot) {
                onSelectHotspot({
                  row: leafProps.rawRow,
                  sensor,
                  isPeatland: isPeat,
                  loading: false
                });
              }
            }
          });

          layerGroup.addLayer(circleMarker);
          renderedMarkers.set(key, circleMarker);
        }
      }

      // Remove only markers that have left the viewport
      renderedMarkers.forEach((marker, key) => {
        if (!currentKeys.has(key)) {
          layerGroup.removeLayer(marker);
          renderedMarkers.delete(key);
        }
      });
    };

    // Initial render
    updateClusters();

    // Debounced update on moveend / zoomend (100ms) to ensure smooth native CSS zoom
    let debounceTimer: any = null;
    const debouncedUpdate = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        updateClusters();
      }, 100);
    };

    map.on('moveend zoomend', debouncedUpdate);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      map.off('moveend zoomend', debouncedUpdate);
      layerGroup.clearLayers();
      renderedMarkers.clear();
      map.removeLayer(layerGroup);
    };
  }, [map, mode, superclusterIndex, sensor]);

  if (loading || error || !activeHotspots || activeHotspots.length === 0) return null;

  if (mode === 'heatmap') {
    return <HeatmapOverlay hotspots={activeHotspots} />;
  }

  return null;
}
