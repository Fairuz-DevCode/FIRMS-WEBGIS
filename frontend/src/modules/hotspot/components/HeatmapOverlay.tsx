// ==============================================================================
// OVERLAY HEATMAP TITIK API (HEATMAP OVERLAY)
// ==============================================================================
// Merender layer kerapatan titik api (heatmap) menggunakan leaflet.heat dengan culling.
// ==============================================================================

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Pastikan global window.L tersedia untuk leaflet.heat di ES Module bundler
if (typeof window !== 'undefined') {
  (window as any).L = L;
}
import 'leaflet.heat';

import { HotspotMatrixRow } from '../types/hotspot.types';
import { HOTSPOT_COL } from '../constants/hotspot.constants';

interface HeatmapOverlayProps {
  hotspots: HotspotMatrixRow[];
}

export const HeatmapOverlay: React.FC<HeatmapOverlayProps> = ({ hotspots }) => {
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
            0.3: '#f59e0b',  // Amber (Sedang < 62°C)
            0.65: '#ea580c', // Oranye (Tinggi 62 - 76°C)
            1.0: '#dc2626'   // Merah (Ekstrem >= 77°C)
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
};

export default HeatmapOverlay;
