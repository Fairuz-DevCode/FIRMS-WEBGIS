import React, { useEffect, useState } from "react";
import { GeoJSON } from "react-leaflet";
import { Layer, PathOptions } from "leaflet";
import {
  PeatlandFeatureCollection,
  PeatlandProperties,
} from "../../../types/peatland";

export const peatlandStyle: PathOptions = {
  color: "#CD853F", // Dark Orange / Amber border
  fillColor: "#E6B875", // Amber fill
  fillOpacity: 0.35, // Semi-transparent
  weight: 1.5,
};

interface PeatlandLayerProps {
  visible?: boolean;
}

export const PeatlandLayer: React.FC<
  PeatlandLayerProps
> = ({ visible = true }) => {
  const [data, setData] =
    useState<PeatlandFeatureCollection | null>(null);

  useEffect(() => {
    if (!visible) return;

    let isMounted = true;

    const loadPeatlandData = async () => {
      try {
        const backendUrl =
          (import.meta as any).env?.VITE_API_URL ||
          "http://localhost:5000";
        const apiRes = await fetch(
          `${backendUrl}/api/peatland`,
        );
        if (apiRes.ok) {
          const json = await apiRes.json();
          if (isMounted) setData(json);
        }
      } catch (err) {
        console.error(
          "[PeatlandLayer] Could not fetch peatland data from database API:",
          err,
        );
      }
    };

    loadPeatlandData();

    return () => {
      isMounted = false;
    };
  }, [visible]);

  if (!visible || !data) return null;

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
          <h4 style="margin: 0 0 6px 0; color: #d97706; font-size: 14px; font-weight: bold;">🌿 ${title}</h4>
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
