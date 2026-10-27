import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * Returns true if the given [lng, lat] coordinate is within Indonesian territory.
 * Covers all major island groups: Sumatera, Kalimantan (Indonesia only),
 * Jawa, Sulawesi, Nusa Tenggara, Maluku, and Papua.
 * Excludes Malaysia (Sabah/Sarawak), Singapore, Brunei, and Timor-Leste.
 */
function isInIndonesia(lng: number, lat: number): boolean {
  // Rentang koordinat kepulauan Indonesia: Sabang sampai Merauke
  return lng >= 95.0 && lng <= 141.0 && lat >= -11.0 && lat <= 6.1;
}

export type ClimateType = 'rainfall' | 'soil_moisture' | 'temperature';

interface ClimateLayerProps {
  type: ClimateType;
  visible: boolean;
  opacity?: number;
}

// Convert RGB hex string to RGBA values [r, g, b, a]
function hexToRgba(hex: string, alpha: number = 200): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

import { 
  getRainfallColor, 
  getSoilMoistureColor, 
  getTemperatureColor 
} from '../../shared/constants/climate.constants';

function getGridColorRgba(type: ClimateType, val: number): [number, number, number, number] {
  let hex = '#38bdf8';
  if (type === 'rainfall') {
    hex = getRainfallColor(val);
  } else if (type === 'soil_moisture') {
    hex = getSoilMoistureColor(val);
  } else if (type === 'temperature') {
    hex = getTemperatureColor(val);
  }
  return hexToRgba(hex, 220);
}

export const ClimateLayer: React.FC<ClimateLayerProps> = ({
  type,
  visible,
  opacity = 0.75,
}) => {
  const map = useMap();
  const [data, setData] = useState<number[][]>([]);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;
    const endpoint = type === 'rainfall' 
      ? '/api/rainfall?limit=20000' 
      : (type === 'soil_moisture' ? '/api/soil-moisture?limit=20000' : '/api/temperature?limit=20000');

    const backendUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

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
      const pixelIdx = (y * cols + x) * 4;

      pixels[pixelIdx] = r;
      pixels[pixelIdx + 1] = g;
      pixels[pixelIdx + 2] = b;
      pixels[pixelIdx + 3] = a;
    }

    ctx.putImageData(imgData, 0, 0);

    // Apply smooth bilinear interpolation by scaling to high-res raster
    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = cols * 4;
    smoothCanvas.height = rows * 4;
    const sCtx = smoothCanvas.getContext('2d');
    if (sCtx) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.drawImage(canvas, 0, 0, smoothCanvas.width, smoothCanvas.height);
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
  }, [map, visible, data, type]);

  // Dynamically update overlay opacity instantly when slider changes
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

export default ClimateLayer;
