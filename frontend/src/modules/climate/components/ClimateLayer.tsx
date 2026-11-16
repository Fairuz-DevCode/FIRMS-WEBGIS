// BAGIAN 1: Import library dan modul pendukung
import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { ClimateType } from '../types/climate.types';
import { 
  getRainfallColor, 
  getSoilMoistureColor, 
  getTemperatureColor 
} from '../constants/climate.constants';
import { fetchClimateGrid, getBoundaryGeoJSON } from '../api/climate';

interface ClimateLayerProps {
  type: ClimateType;
  visible: boolean;
  opacity?: number;
  date?: string;
}

// BAGIAN 2: Fungsi clipping mask vektor batas kepulauan Indonesia
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

function isInIndonesia(lng: number, lat: number): boolean {
  return lng >= 95.0 && lng <= 141.0 && lat >= -11.0 && lat <= 6.1;
}

function hexToRgba(hex: string, alpha: number = 220): [number, number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255, alpha];
}

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

// BAGIAN 4: Komponen layer raster iklim kontinu menggunakan HTML5 Canvas
export const ClimateLayer: React.FC<ClimateLayerProps> = ({
  type,
  visible,
  opacity = 0.75,
  date,
}) => {
  const map = useMap();
  const [data, setData] = useState<number[][]>([]);
  const [boundary, setBoundary] = useState<any>(null);
  const overlayRef = useRef<L.ImageOverlay | null>(null);

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
    fetchClimateGrid(type, date)
      .then(gridData => {
        if (isMounted) {
          setData(gridData);
        }
      })
      .catch(err => {
        console.warn(`[ClimateLayer ${type}] Gagal memuat grid:`, err);
      });

    return () => { isMounted = false; };
  }, [type, visible, date]);

  // BAGIAN 5: Render raster, interpolasi spatial kernel, dan masking pada peta
  useEffect(() => {
    if (!map) return;

    if (overlayRef.current) {
      if (map.hasLayer(overlayRef.current)) {
        map.removeLayer(overlayRef.current);
      }
      overlayRef.current = null;
    }

    if (!visible || !data || data.length === 0) return;

    const minLat = -11.0;
    const maxLat = 6.0;
    const minLon = 95.0;
    const maxLon = 141.0;
    const step = 0.1;

    const cols = Math.round((maxLon - minLon) / step) + 1;
    const rows = Math.round((maxLat - minLat) / step) + 1;

    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.createImageData(cols, rows);
    const pixels = imgData.data;

    const valSum = new Float32Array(cols * rows);
    const weightSum = new Float32Array(cols * rows);
    const interpRadius = data.length < 5000 ? 6 : 2;

    for (let i = 0; i < data.length; i++) {
      const [lat, lng, val] = data[i];
      if (lat === undefined || lng === undefined || val === null || val === undefined) continue;
      if (!isInIndonesia(lng, lat)) continue;

      if (type === 'soil_moisture' && val <= 0.01) continue;
      if (type === 'temperature' && val < 5) continue;
      if (type === 'rainfall' && val < 0) continue;

      const x = Math.round((lng - minLon) / step);
      const y = Math.round((maxLat - lat) / step);

      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

      for (let dy = -interpRadius; dy <= interpRadius; dy++) {
        for (let dx = -interpRadius; dx <= interpRadius; dx++) {
          const d2 = dx * dx + dy * dy;
          if (d2 <= interpRadius * interpRadius) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const idx = ny * cols + nx;
              const dist = Math.sqrt(d2);
              const w = Math.cos((dist / interpRadius) * (Math.PI / 2));
              valSum[idx] += val * w;
              weightSum[idx] += w;
            }
          }
        }
      }
    }

    for (let idx = 0; idx < cols * rows; idx++) {
      const totalW = weightSum[idx];
      if (totalW > 0.001) {
        const interpolatedVal = valSum[idx] / totalW;
        const [r, g, b, a] = getGridColorRgba(type, interpolatedVal);
        const pixelIdx = idx * 4;
        pixels[pixelIdx] = r;
        pixels[pixelIdx + 1] = g;
        pixels[pixelIdx + 2] = b;
        pixels[pixelIdx + 3] = a;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const smoothCanvas = document.createElement('canvas');
    smoothCanvas.width = cols * 4;
    smoothCanvas.height = rows * 4;
    const sCtx = smoothCanvas.getContext('2d');
    if (sCtx) {
      sCtx.imageSmoothingEnabled = true;
      sCtx.imageSmoothingQuality = 'high';
      sCtx.filter = 'blur(2px)';
      sCtx.drawImage(canvas, 0, 0, smoothCanvas.width, smoothCanvas.height);

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

          sCtx.globalCompositeOperation = 'destination-in';
          sCtx.filter = 'none';
          sCtx.drawImage(maskCanvas, 0, 0);
        }
      }
    }

    const dataUrl = (sCtx ? smoothCanvas : canvas).toDataURL('image/png');

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

  // BAGIAN 6: Sinkronisasi nilai opasitas layer saat slider digeser
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

export default ClimateLayer;
