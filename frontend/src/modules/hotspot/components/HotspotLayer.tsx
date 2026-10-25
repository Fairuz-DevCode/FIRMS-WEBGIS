import React, { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster, { PointFeature, ClusterProperties } from 'supercluster';

// Ensure global window.L exists for leaflet.heat in ES Module bundlers
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';

import { HotspotMatrixRow, SensorType, HOTSPOT_COL } from '../../../types/hotspot';
import { useHotspots } from '../hooks/useHotspots';
import { isPointInPeatlands } from '../../../shared/utils/spatial.utils';

export interface HotspotStyle {
  color: string;
  fillColor: string;
  level: 'high' | 'nominal' | 'low';
  radius: number;
}

/**
 * Computes marker color & size based on confidence level, brightness, and FRP.
 * Green: Low | Yellow: Medium/Nominal | Red: High
 */
export function getHotspotStyleFromRow(row: HotspotMatrixRow): HotspotStyle {
  const bright = row[HOTSPOT_COL.BRIGHTNESS] || 0;
  const frp = row[HOTSPOT_COL.FRP] || 0;
  const conf = String(row[HOTSPOT_COL.CONFIDENCE] || '').toLowerCase();

  let color = '#16a34a';       // Green — Low
  let fillColor = '#22c55e';
  let level: 'high' | 'nominal' | 'low' = 'low';

  if (conf === 'high' || conf === 'h' || Number(conf) >= 80 || bright >= 355) {
    color = '#dc2626';         // Red — High
    fillColor = '#ef4444';
    level = 'high';
  } else if (
    conf === 'nominal' ||
    conf === 'n' ||
    conf === 'm' ||
    conf === 'med' ||
    conf === 'medium' ||
    (Number(conf) >= 30 && Number(conf) < 80) ||
    bright >= 325
  ) {
    color = '#ca8a04';         // Yellow — Medium / Nominal
    fillColor = '#eab308';
    level = 'nominal';
  }

  const radius = Math.min(Math.max(3.5 + (frp || 0) / 35, 4), 8);
  return { color, fillColor, level, radius };
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

  // Peatland status badge (Always active by default)
  const isPeat = context?.isPeatland === true;
  const peatBadgeBg = isPeat ? '#fef3c7' : '#f1f5f9';
  const peatBadgeColor = isPeat ? '#b45309' : '#64748b';
  const peatBadgeBorder = isPeat ? '#fde68a' : '#cbd5e1';
  const peatLabel = isPeat ? '🌿 DI DALAM GAMBUT' : 'DI LUAR GAMBUT';

  return `
    <div style="min-width: 240px; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 12px; color: #334155; padding: 2px;">
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;">
        <span style="font-weight: 700; color: #0f172a; font-size: 13px;">🔥 Titik Api Aktif</span>
        <span style="font-weight: 700; font-size: 10px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid ${badgeBorder}; background: ${badgeBg}; color: ${badgeColor};">
          ${confidence || 'N/A'}
        </span>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
        <span>Sensor / Satelit:</span>
        <strong style="color: #0f172a;">${sensorName}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
        <span>Waktu Deteksi:</span>
        <strong style="color: #0f172a;">${acq_date} ${acq_time} UTC</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
        <span>Suhu Kecerahan:</span>
        <strong style="color: #ef4444;">${brightness !== null ? Number(brightness).toFixed(1) + ' K' : 'N/A'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
        <span>FRP (Kekuatan Api):</span>
        <strong style="color: #0f172a;">${frp !== null ? Number(frp).toFixed(1) + ' MW' : 'N/A'}</strong>
      </div>
      <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f1f5f9;">
        <span>Koordinat:</span>
        <strong style="color: #0f172a;">${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}</strong>
      </div>

      <!-- STATUS LAHAN GAMBUT (SELALU AKTIF) -->
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
        <span style="font-weight: 600;">Status Lahan Gambut:</span>
        <span style="font-weight: 700; font-size: 9px; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; border: 1px solid ${peatBadgeBorder}; background: ${peatBadgeBg}; color: ${peatBadgeColor};">
          ${peatLabel}
        </span>
      </div>

      <!-- DINAMIS SESUAI LAYER YANG AKTIF -->
      ${context?.showLandCover ? `
        <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; background: #f0fdf4; margin: 2px -2px; padding: 3px 4px; border-radius: 4px;">
          <span style="color: #166534; font-weight: 600;">🗺️ Penutupan Lahan:</span>
          <strong style="color: #15803d;">${context.landCoverClass || 'Hutan Rawa Gambut / Vegetasi'}</strong>
        </div>
      ` : ''}

      ${context?.showRainfall ? `
        <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; background: #f0f9ff; margin: 2px -2px; padding: 3px 4px; border-radius: 4px;">
          <span style="color: #0369a1; font-weight: 600;">🌧️ Curah Hujan:</span>
          <strong style="color: #0284c7;">
            ${context.rainfall ? `${context.rainfall.value} mm (${context.rainfall.category})` : 'Memuat data...'}
          </strong>
        </div>
      ` : ''}

      ${context?.showSoilMoisture ? `
        <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #f1f5f9; background: #fffbeb; margin: 2px -2px; padding: 3px 4px; border-radius: 4px;">
          <span style="color: #92400e; font-weight: 600;">💧 Kelembaban Tanah:</span>
          <strong style="color: #b45309;">
            ${context.soilMoisture ? `${context.soilMoisture.value} m³/m³ (${context.soilMoisture.category})` : 'Memuat data...'}
          </strong>
        </div>
      ` : ''}

      ${context?.showTemperature ? `
        <div style="display: flex; justify-content: space-between; padding: 3px 0; background: #fef2f2; margin: 2px -2px; padding: 3px 4px; border-radius: 4px;">
          <span style="color: #991b1b; font-weight: 600;">🌡️ Suhu Udara:</span>
          <strong style="color: #dc2626;">
            ${context.temperature ? `${context.temperature.value} °C (${context.temperature.category})` : 'Memuat data...'}
          </strong>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Creates lightweight, hardware-accelerated cluster badge.
 * Uses GPU translate3d with zero expensive spread box-shadows.
 */
function createClusterIcon(count: number): L.DivIcon {
  let size = 34;
  let bg = '#eab308';       // yellow
  let borderColor = '#fef08a';
  let formatted = String(count);

  if (count >= 5000) {
    size = 48;
    bg = '#dc2626';         // crimson red
    borderColor = '#fca5a5';
    formatted = (count / 1000).toFixed(1) + 'k';
  } else if (count >= 1000) {
    size = 42;
    bg = '#ea580c';         // deep orange
    borderColor = '#fdba74';
    formatted = (count / 1000).toFixed(1) + 'k';
  } else if (count >= 100) {
    size = 38;
    bg = '#f59e0b';         // amber
    borderColor = '#fde68a';
  }

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
        font-size: ${size >= 42 ? '12px' : '11px'};
        color: #ffffff;
        background: ${bg};
        border: 2px solid ${borderColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        transform: translate3d(0, 0, 0);
        will-change: transform;
        cursor: pointer;
        user-select: none;
      "
      title="${count.toLocaleString()} titik api terdeteksi">
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
  peatlandPolygons = []
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

    const index = new Supercluster<HotspotFeatureProperties>({
      radius: 95,     // Regional radius to ensure 20-40 clean clusters across Indonesia
      maxZoom: 16,    // Stop clustering after zoom 16
      minPoints: 2
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
          const icon = createClusterIcon(pointCount);

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

          circleMarker.bindPopup(() => createPopupContent(leafProps.rawRow, sensor, baseContext), {
            maxWidth: 300
          });

          // Dynamic asynchronous fetch when clicked: if climate layers are active
          circleMarker.on('click', async () => {
            if (baseContext.showRainfall || baseContext.showSoilMoisture || baseContext.showTemperature) {
              try {
                const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
                const res = await fetch(`${backendUrl}/api/hotspots/context?lat=${lat}&lng=${lng}`);
                if (res.ok) {
                  const data = await res.json();
                  const updatedContext: ActiveLayersContext = {
                    ...baseContext,
                    isPeatland: data.is_peatland ?? isPeat,
                    rainfall: data.rainfall ? { value: data.rainfall.value, category: data.rainfall.category } : undefined,
                    soilMoisture: data.soil_moisture ? { value: data.soil_moisture.value, category: data.soil_moisture.category } : undefined,
                    temperature: data.temperature ? { value: data.temperature.value, category: data.temperature.category } : undefined,
                  };
                  circleMarker.setPopupContent(createPopupContent(leafProps.rawRow, sensor, updatedContext));
                }
              } catch (e) {
                console.warn('[HotspotLayer] Context fetch error:', e);
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
