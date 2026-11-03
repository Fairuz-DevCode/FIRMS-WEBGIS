declare module 'georaster' {
  export interface GeoRaster {
    height: number;
    width: number;
    pixelHeight: number;
    pixelWidth: number;
    projection: number;
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    noDataValue: number | null;
    numberOfRasters: number;
    values: number[][][];
    toCanvas: (options?: any) => HTMLCanvasElement;
  }

  export default function parseGeoRaster(
    input: ArrayBuffer | Blob | File | string
  ): Promise<GeoRaster>;
}

declare module 'georaster-layer-for-leaflet' {
  import * as L from 'leaflet';
  import { GeoRaster } from 'georaster';

  export interface GeoRasterLayerOptions extends L.GridLayerOptions {
    georaster: GeoRaster;
    opacity?: number;
    pixelValuesToColorFn?: (values: number[]) => string | null;
    resolution?: number;
    debugLevel?: number;
  }

  export default class GeoRasterLayer extends L.GridLayer {
    constructor(options: GeoRasterLayerOptions);
  }
}
