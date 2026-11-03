import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { getApiBaseUrl } from '../../../shared/utils/api';
import { ClimateType } from '../types/climate.types';
export type { ClimateType };

interface ClimateLayerProps {
  type: ClimateType;
  visible: boolean;
  opacity?: number;
}

// Module-level cache for Indonesia boundary GeoJSON to prevent redundant network fetches
let cachedBoundaryGeoJSON: any = null;
let boundaryPromise: Promise<any> | null = null;

async function getBoundaryGeoJSON(): Promise<any> {
  if (cachedBoundaryGeoJSON) return cachedBoundaryGeoJSON;
  if (!boundaryPromise) {
    boundaryPromise = fetch('/indonesia_boundary.geojson')
      .then(res => res.json())
      .then(json => {
        cachedBoundaryGeoJSON = json;
        return json;
      })
      .catch(err => {
        console.warn('Failed to load indonesia_boundary.geojson:', err);
        return null;
      });
  }
  return boundaryPromise;
}

/**
 * Draws the vector boundary of all Indonesian islands onto the canvas context.
 * Used as a sub-pixel vector clipping mask to cut raster graphics along exact coastlines.
 */
function drawBoundaryMask(
  ctx: CanvasRenderingContext2D,
  boundary: any,
  width: number,
  height: number,
  bounds: { west: number; east: number; south: number; north: number }
) {
  const { west, east, south, north } = bounds;
  const lonSpan = east - west;
  const latSpan = north - south;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();

  const toX = (lng: number) => ((lng - west) / lonSpan) * width;
  const toY = (lat: number) => ((north - lat) / latSpan) * height;

  const renderRings = (rings: number[][][]) => {
    for (const ring of rings) {
      if (!ring || ring.length === 0) continue;
      ctx.moveTo(toX(ring[0][0]), toY(ring[0][1]));
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(toX(ring[i][0]), toY(ring[i][1]));
      }
      ctx.closePath();
    }
  };

  for (const feature of boundary.features || []) {
    const geom = feature.geometry;
    if (!geom) continue;

    if (geom.type === 'Polygon') {
      renderRings(geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (const poly of geom.coordinates) {
        renderRings(poly);
      }
    }
  }

  ctx.fill('evenodd');
}

/**
 * Geographic bounding box check for Indonesian domain
 */
function isInIndonesia(lng: number, lat: number): boolean {
  return lng >= 95.0 && lng <= 141.0 && lat >= -11.0 && lat <= 6.1;
}

// Convert RGB hex string to RGBA values [r, g, b, a]
function hexToRgba(hex: string, alpha: number = 220): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

import { 
  getRainfallColor, 
  getSoilMoistureColor, 
  getTemperatureColor 
} from '../../../map/constants/climate.constants';

function getGridColorRgba(type: ClimateType, val: number): [number, number, number, number] {
  let hex = '#38bdf8';
  if (type === 'rainfall') {
    hex = getRainfallColor(val);
  } else if (type === 'soil_moisture') {
    hex = getSoilMoistureColor(val);
  } else if (type === 'temperature') {
    hex = getTemperatureColor(val);
  }
  return hexToRgba(hex, 230);
}

export const ClimateLayer: React.FC<ClimateLayerProps> = ({
  type,
  visible,
  opacity = 0.75,
}) => {
  const map = useMap();
  const [data, setData] = useState<number[][]>([]);
  const [boundary, setBoundary] = useState<any>(cachedBoundaryGeoJSON);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  // Fetch Indonesia boundary GeoJSON for vector masking
  useEffect(() => {
    if (!boundary) {
      getBoundaryGeoJSON().then(geojson => {
        if (geojson) setBoundary(geojson);
      });
    }
  }, [boundary]);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const endpoint = type === 'rainfall' 
      ? '/api/rainfall?limit=20000' 
      : (type === 'soil_moisture' ? '/api/soil-moisture?limit=20000' : '/api/temperature?limit=20000');

    const backendUrl = getApiBaseUrl();

    fetch(`${backendUrl}${endpoint}`)
      .then(res => res.json())
      .then(json => {
        if (isMounted && json.data) {
          setData(json.data);
        }
      })
      .catch(err => {
        console.warn(`[ClimateLayer ${type}] Failed to fetch grid data:`, err);
      });

    return () => { isMounted = false; };
  }, [type, visible]);

  useEffect(() => {
    if (!map) return;

    // Clean up previous overlay
    if (overlayRef.current) {
      if (map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
      }
      overlayRef.current = null;
    }

    if (!visible || !data || data.length === 0) return;

    // Grid bounds definition for Indonesia ERA5 domain
    // Lat: -11.0 to 6.0 (step 0.1 deg -> 171 rows)
    // Lon: 95.0 to 141.0 (step 0.1 deg -> 461 cols)
    const minLat = -11.0;
    const maxLat = 6.0;
    const minLon = 95.0;
    const maxLon = 141.0;
    const step = 0.1;

    const cols = Math.round((maxLon - minLon) / step) + 1; // 461
    const rows = Math.round((maxLat - minLat) / step) + 1; // 171

    // Create an offscreen canvas to generate continuous meteorological raster
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(cols, rows);
    const pixels = imgData.data;

    // Point radius: 1 pixel spread for dense data to guarantee complete overlap without gaps
    // 3 pixels for dynamic / sparse grid
    const radius = data.length < 5000 ? 3 : 1;

    // Map each data point into the continuous grid surface
    for (let i = 0; i < data.length; i++) {
      const [lat, lng, val] = data[i];
      if (lat === undefined || lng === undefined || val === undefined) continue;
      if (!isInIndonesia(lng, lat)) continue;

      // Col (X) from west (95.0) to east (141.0)
      const x = Math.round((lng - minLon) / step);
      // Row (Y) from north (6.0) to south (-11.0)
      const y = Math.round((maxLat - lat) / step);

      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

      const [r, g, b, a] = getGridColorRgba(type, val);

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
          if (dx * dx + dy * dy <= radius * radius) {
            const pixelIdx = (ny * cols + nx) * 4;
            pixels[pixelIdx] = r;
            pixels[pixelIdx + 1] = g;
            pixels[pixelIdx + 2] = b;
            pixels[pixelIdx + 3] = a;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply high-resolution scaling with bilinear smoothing to blend discrete grid steps into smooth weather gradients
    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = cols * 4;
    smoothCanvas.height = rows * 4;
    const sCtx = smoothCanvas.getContext('2d');
    if (sCtx) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.filter = 'blur(2px)';
      sCtx.drawImage(canvas, 0, 0, smoothCanvas.width, smoothCanvas.height);

      // Apply Indonesia vector coastline and border mask (cuts the raster exactly along real island borders)
      if (boundary) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = smoothCanvas.width;
        maskCanvas.height = smoothCanvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          drawBoundaryMask(maskCtx, boundary, maskCanvas.width, maskCanvas.height, {
            west: minLon - step / 2,
            east: maxLon + step / 2,
            south: minLat - step / 2,
            north: maxLat + step / 2,
          });

          // Composite operation: keep only pixels that fall strictly inside Indonesian land territory
          sCtx.globalCompositeOperation = 'destination-in';
          sCtx.filter = 'none';
          sCtx.drawImage(maskCanvas, 0, 0);
        }
      }
    }

    const dataUrl = (sCtx ? smoothCanvas : canvas).toDataURL('image/png');

    // Geo-referenced bounds for the continuous meteorological raster
    const imageBounds = L.latLngBounds(
      [minLat - step / 2, minLon - step / 2],
      [maxLat + step / 2, maxLon + step / 2]
    );

    const overlay = L.imageOverlay(dataUrl, imageBounds, {
      opacity: opacity,
      interactive: false,
      pane: map.getPane('climatePane') ? 'climatePane' : 'overlayPane',
    });

    overlay.addTo(map);
    overlayRef.current = overlay;

    return () => {
      if (overlayRef.current && map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
        overlayRef.current = null;
      }
    };
  }, [map, visible, data, type, boundary]);

  // Dynamically update overlay opacity instantly when slider changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  // Dynamically update overlay opacity instantly when slider changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

export default ClimateLayer;
