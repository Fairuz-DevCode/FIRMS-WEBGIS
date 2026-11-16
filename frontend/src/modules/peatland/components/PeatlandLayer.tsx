// BAGIAN 1: Import library dan modul pendukung
import React, { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { Layer } from "leaflet";
import {
  PeatlandFeatureCollection,
  PeatlandProperties,
} from "../types/peatland.types";
import { peatlandStyle } from "../constants/peatland.constants";
import { fetchPeatlandGeoJSON } from "../api/peatland";

export { peatlandStyle };

interface PeatlandLayerProps {
  visible?: boolean;
}

// BAGIAN 3: Komponen GeoJSON layer lahan gambut
export const PeatlandLayer: React.FC<
  PeatlandLayerProps
> = ({ visible = true }) => {
  const [data, setData] =
    useState<PeatlandFeatureCollection | null>(null);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    fetchPeatlandGeoJSON()
      .then((json) => {
        if (isMounted) setData(json);
      })
      .catch((err) => {
        console.error("[PeatlandLayer] Gagal memuat data gambut:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [visible]);

  if (!visible || !data) return null;

  // BAGIAN 4: Binding popup informasi poligon lahan gambut
  const onEachFeature = (feature: any, layer: Layer) => {
    if (feature.properties) {
      const props =
        feature.properties as PeatlandProperties;
      const title =
        props.namobj ||
        props.name ||
        "Kawasan Gambut Indonesia";
      const shapeArea = props.shape_Area
        ? (Number(props.shape_Area) / 10000).toFixed(2)
        : undefined;

      const popupHtml = `
        <div style="min-width: 200px; padding: 4px; font-family: sans-serif; color: #0f172a;">
          <h4 style="margin: 0 0 6px 0; color: #d97706; font-size: 14px; font-weight: bold;">${title}</h4>
          ${shapeArea ? `<p style="margin: 2px 0; font-size: 12px; color: #475569;"><b>Keluasan:</b> ${shapeArea} ha</p>` : ""}
          <p style="margin: 2px 0; font-size: 12px; color: #475569;"><b>Status:</b> Kawasan Lindung Gambut</p>
        </div>
      `;
      layer.bindPopup(popupHtml);
    }
  };

  return (
    <GeoJSON
      key={`peatland-layer-${data.features?.length || 0}`}
      data={data as any}
      pane="peatlandPane"
      style={() => peatlandStyle}
      onEachFeature={onEachFeature}
    />
  );
};

export default PeatlandLayer;
