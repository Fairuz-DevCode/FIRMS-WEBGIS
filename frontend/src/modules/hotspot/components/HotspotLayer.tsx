// ==============================================================================
// LAYER TITIK API (HOTSPOT LAYER COMPONENT)
// ==============================================================================
// Mengelola rendering klaster Supercluster, penanda api, dan heatmap pada peta Leaflet.
// ==============================================================================

import React, { useEffect, useMemo, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import Supercluster, { PointFeature, ClusterProperties } from 'supercluster';

import { HotspotMatrixRow, SensorType, SelectedHotspotAnalytics } from '../types/hotspot.types';
import { HOTSPOT_COL } from '../constants/hotspot.constants';
import { useHotspots } from '../hooks/useHotspots';
import { getHotspotSatellite } from './SatelliteStatsWidget';
import { isPointInPeatlands } from '../../../shared/utils/spatial.utils';
import { getApiBaseUrl } from '../../../shared/utils/api';
import { ESRI_LAND_COVER_CLASSES } from '../../land_cover/constants/landCover.constants';

import { 
  createClusterIcon, 
  createHotspotFireIcon, 
  getHotspotStyle, 
  getHotspotStyleFromRow, 
  getTemperatureColor,
  HotspotStyle 
} from '../utils/hotspotIcons.utils';
import { createPopupContent, ActiveLayersContext } from '../utils/hotspotPopup.utils';
import { HeatmapOverlay } from './HeatmapOverlay';

export type { HotspotStyle, ActiveLayersContext };
export { getHotspotStyle, getHotspotStyleFromRow, getTemperatureColor };

interface HotspotFeatureProperties {
  id?: number;
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

// BAGIAN 1: Komponen utama HotspotLayer
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

  // Sinkronisasi data ke parent tanpa memicu render loop
  const lastSyncedRef = useRef<HotspotMatrixRow[] | null>(null);
  useEffect(() => {
    if (!loading && !error && onHotspotData && fetchedHotspots !== lastSyncedRef.current) {
      lastSyncedRef.current = fetchedHotspots;
      onHotspotData(fetchedHotspots);
    }
  }, [fetchedHotspots, loading, error, onHotspotData]);

  const activeHotspots = features !== undefined ? features : fetchedHotspots;

  // BAGIAN 2: Inisialisasi indeks Supercluster untuk pengelompokan titik berdekatan
  const superclusterIndex = useMemo(() => {
    if (!activeHotspots || activeHotspots.length === 0) return null;

    const index = new Supercluster<HotspotFeatureProperties, HotspotClusterProperties>({
      radius: 40,
      maxZoom: 13,
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
          id: i,
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

  // BAGIAN 3: Siklus render penanda marker dengan rekonsiliasi DOM berkinerja tinggi
  useEffect(() => {
    if (!map || mode !== 'markers' || !superclusterIndex) return;

    const hotspotPaneName = map.getPane('hotspotPane') ? 'hotspotPane' : 'markerPane';
    const layerGroup = L.layerGroup().addTo(map);

    const renderedMarkers = new Map<string, L.Layer>();

    const updateClusters = () => {
      if ((map as any)._animatingZoom) return;

      const bounds = map.getBounds();
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
          : `p_${leafProps?.id ?? `${leafProps?.lat}_${leafProps?.lng}`}`;

        currentKeys.add(key);

        if (renderedMarkers.has(key)) {
          continue;
        }

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

          clusterMarker.on('click', (e: L.LeafletMouseEvent) => {
            if (e?.originalEvent) {
              L.DomEvent.stopPropagation(e);
            }
            try {
              const leaves = superclusterIndex.getLeaves(clusterId, Infinity);
              if (leaves && leaves.length > 0) {
                const coords = leaves.map(l => [l.geometry.coordinates[1], l.geometry.coordinates[0]] as [number, number]);
                const clusterBounds = L.latLngBounds(coords);
                if (clusterBounds.getNorthEast().equals(clusterBounds.getSouthWest())) {
                  map.setView([lat, lng], Math.min(Math.max(map.getZoom() + 3, 11), 17));
                } else {
                  map.fitBounds(clusterBounds, { padding: [60, 60], maxZoom: 16 });
                }
                return;
              }
            } catch (err) {
              console.warn('[HotspotLayer] fitBounds fallback:', err);
            }

            const expansionZoom = superclusterIndex.getClusterExpansionZoom(clusterId);
            const targetZoom = Math.max(map.getZoom() + 2, expansionZoom, 11);
            map.flyTo([lat, lng], Math.min(targetZoom, 17), { duration: 0.35 });
          });

          layerGroup.addLayer(clusterMarker);
          renderedMarkers.set(key, clusterMarker);
        } else if (leafProps) {
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

          const fireIcon = createHotspotFireIcon(leafProps.rawRow);

          const fireMarker = L.marker([lat, lng], {
            icon: fireIcon,
            pane: hotspotPaneName
          });

          const satLabel = sensor === 'ALL'
            ? (getHotspotSatellite(leafProps.rawRow) === 'NOAA20' ? 'VIIRS NOAA-20 (375m)' : 'VIIRS S-NPP (375m)')
            : sensor === 'VIIRS_NOAA20_NRT'
              ? 'VIIRS NOAA-20 (375m)'
              : 'VIIRS S-NPP (375m)';

          fireMarker.bindPopup(() => createPopupContent(leafProps.rawRow, satLabel, baseContext), {
            maxWidth: 280,
            className: 'hotspot-leaflet-popup'
          });

          // Klik titik api: Buka sidebar analisis dan query konteks lingkungan PostGIS
          fireMarker.on('click', async () => {
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

              const climateData = await fetch(`${backendUrl}/api/hotspots/context?lat=${lat}&lng=${lng}&date=${targetDate}`)
                .then(r => r.ok ? r.json() : null)
                .catch(() => null);

              const isPointPeat = climateData?.is_peatland ?? isPeat;
              const pointRainfall = climateData?.rainfall ? { value: climateData.rainfall.value, category: climateData.rainfall.category } : undefined;
              const pointSoilMoisture = climateData?.soil_moisture ? { value: climateData.soil_moisture.value, category: climateData.soil_moisture.category } : undefined;
              const pointTemperature = climateData?.temperature ? { value: climateData.temperature.value, category: climateData.temperature.category } : undefined;

              let currentContext: ActiveLayersContext = {
                ...baseContext,
                isPeatland: isPointPeat,
                landCoverClass: baseContext.landCoverClass || 'Vegetasi / Lahan Terbuka',
                rainfall: pointRainfall,
                soilMoisture: pointSoilMoisture,
                temperature: pointTemperature,
              };

              const updatePopupHtml = (ctx: ActiveLayersContext) => {
                const html = createPopupContent(leafProps.rawRow, satLabel, ctx);
                fireMarker.setPopupContent(html);
                const popup = fireMarker.getPopup();
                if (popup && fireMarker.isPopupOpen()) {
                  popup.setContent(html);
                }
              };

              updatePopupHtml(currentContext);

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

              // Query asinkronus ke Esri Sentinel-2 (timeout 3.5 detik)
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
                      updatePopupHtml(currentContext);
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
                .catch(() => {});
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

          layerGroup.addLayer(fireMarker);
          renderedMarkers.set(key, fireMarker);
        }
      }

      renderedMarkers.forEach((marker, key) => {
        if (!currentKeys.has(key)) {
          layerGroup.removeLayer(marker);
          renderedMarkers.delete(key);
        }
      });
    };

    updateClusters();

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
