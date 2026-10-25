import React from 'react';
import { Popup } from 'react-leaflet';
import { HotspotProperties } from '../../../types/hotspot';

interface HotspotPopupProps {
  properties: HotspotProperties;
  confidenceLevel: 'high' | 'nominal' | 'low';
}

const BADGE_STYLE: Record<HotspotPopupProps['confidenceLevel'], string> = {
  high: 'bg-red-100 text-red-700 border-red-300',
  nominal: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  low: 'bg-green-100 text-green-700 border-green-300',
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-1 text-[0.75rem] text-slate-600 last:border-b-0">
    <span>{label}</span>
    <strong className="text-slate-900">{children}</strong>
  </div>
);

/**
 * Popup content for a single hotspot marker.
 */
export default function HotspotPopup({ properties: props, confidenceLevel }: HotspotPopupProps) {
  return (
    <Popup>
      <div className="min-w-[250px]">
        <div className="mb-1.5 flex items-center justify-between border-b border-slate-200 pb-1.5">
          <span className="font-display text-sm font-bold text-slate-900">🔥 Active Hotspot</span>
          <span
            className={`rounded-md border px-2 py-0.5 text-[0.7rem] font-bold uppercase ${BADGE_STYLE[confidenceLevel]}`}
          >
            {props.confidence}
          </span>
        </div>

        <Row label="Sensor / Satellite:">
          {props.sensor} ({props.satellite || 'N/A'})
        </Row>
        <Row label="Acquisition Date & Time:">
          {props.acq_date} {props.acq_time} UTC
        </Row>
        <Row label="Brightness Temp:">
          <span className="text-red-500">{props.brightness} K</span>
        </Row>
        <Row label="Confidence Level:">{props.confidence}</Row>
        <Row label="Fire Radiative Power (FRP):">{props.frp ? `${props.frp} MW` : 'N/A'}</Row>
        <Row label="Coordinates (Lat, Long):">
          {props.latitude.toFixed(4)}, {props.longitude.toFixed(4)}
        </Row>
      </div>
    </Popup>
  );
}
