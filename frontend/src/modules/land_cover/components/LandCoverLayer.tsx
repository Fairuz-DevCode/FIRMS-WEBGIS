// BAGIAN 1: Import library dan modul pendukung
import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { LandCoverProvider, LAND_COVER_PROVIDERS } from '../constants/landCover.constants';

interface LandCoverLayerProps {
  visible: boolean;
  provider: LandCoverProvider;
  opacity?: number;
}

// BAGIAN 2: Custom Leaflet TileLayer untuk Esri Sentinel-2 ImageServer
class EsriImageServerTileLayer extends L.TileLayer {
  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const tile = document.createElement('img');

    L.DomEvent.on(tile, 'load', L.Util.bind(this._tileOnLoad, this, done, tile));
    L.DomEvent.on(tile, 'error', L.Util.bind(this._tileOnError, this, done, tile));

    if (this.options.crossOrigin || this.options.crossOrigin === '') {
      tile.crossOrigin = this.options.crossOrigin === true ? '' : this.options.crossOrigin;
    }

    tile.alt = '';
    tile.setAttribute('role', 'presentation');

    const tileSize = this.getTileSize();
    const nwPoint = coords.scaleBy(tileSize);
    const sePoint = nwPoint.add(tileSize);

    const nw = this._map.unproject(nwPoint, coords.z);
    const se = this._map.unproject(sePoint, coords.z);

    const nwProj = L.CRS.EPSG3857.project(nw);
    const seProj = L.CRS.EPSG3857.project(se);

    const minX = Math.min(nwProj.x, seProj.x);
    const maxX = Math.max(nwProj.x, seProj.x);
    const minY = Math.min(nwProj.y, seProj.y);
    const maxY = Math.max(nwProj.y, seProj.y);

    const bbox = `${minX},${minY},${maxX},${maxY}`;
    tile.src =
      'https://ic.imagery1.arcgis.com/arcgis/rest/services/Sentinel2_10m_LandCover/ImageServer/exportImage?' +
      `bbox=${bbox}&bboxSR=3857&imageSR=3857&size=256,256&format=png32&transparent=true&noData=0&noDataInterpretation=esriNoDataMatchAny&f=image`;

    return tile;
  }
}

// BAGIAN 3: Komponen layer tutupan lahan (Esri Sentinel-2 & ESA WorldCover)
export const LandCoverLayer: React.FC<LandCoverLayerProps> = ({
  visible,
  provider,
  opacity = 0.5,
}) => {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!visible) return;

    if (provider === 'esa_worldcover') {
      const config = LAND_COVER_PROVIDERS.esa_worldcover;
      const wmsLayer = L.tileLayer.wms(config.wmsUrl!, {
        layers: config.layerName!,
        format: 'image/png',
        transparent: true,
        opacity: opacity,
        attribution: config.attribution,
        version: '1.3.0',
        pane: map.getPane('landCoverPane') ? 'landCoverPane' : 'overlayPane',
      });
      wmsLayer.addTo(map);
      layerRef.current = wmsLayer;
    } else {
      const tileLayer = new EsriImageServerTileLayer('', {
        opacity: opacity,
        tileSize: 256,
        updateWhenIdle: false,
        updateWhenZooming: true,
        keepBuffer: 6,
        pane: map.getPane('landCoverPane') ? 'landCoverPane' : 'overlayPane',
        attribution: LAND_COVER_PROVIDERS.esri_sentinel2.attribution,
      });

      tileLayer.addTo(map);
      layerRef.current = tileLayer;
    }

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, visible, provider]);

  // BAGIAN 4: Update opasitas layer tanpa me-reload tile
  useEffect(() => {
    if (layerRef.current && (layerRef.current as any).setOpacity) {
      (layerRef.current as any).setOpacity(opacity);
    }
  }, [opacity]);

  return null;
};

export default LandCoverLayer;
