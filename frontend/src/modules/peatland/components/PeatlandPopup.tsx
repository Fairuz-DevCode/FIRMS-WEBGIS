import React from 'react';
import { Popup } from 'react-leaflet';
import { PeatlandProperties } from '../../../types/peatland';

interface PeatlandPopupProps {
  properties: PeatlandProperties;
}

const Row: React.FC<{ label: string; valueClass?: string; children: React.ReactNode }> = ({
  label,
  valueClass = '',
  children,
}) => (
  <tr>
    <td className="py-0.5 text-slate-500">{label}</td>
    <td className={`py-0.5 font-bold ${valueClass}`}>{children}</td>
  </tr>
);

export const PeatlandPopup: React.FC<PeatlandPopupProps> = ({ properties }) => {
  return (
    <Popup>
      <div className="min-w-[220px] p-1">
        <h3 className="mb-2 text-[15px] font-semibold text-emerald-950">🌿 {properties.name}</h3>
        <table className="w-full border-collapse text-xs">
          <tbody>
            <Row label="Provinsi:">{properties.province}</Row>
            <Row label="Kedalaman Gambut:">{properties.depth_m} meter</Row>
            <Row label="Cadangan Karbon:">{properties.carbon_ton_ha} ton/ha</Row>
            <Row label="Status KHG:" valueClass="text-emerald-700">
              {properties.status}
            </Row>
          </tbody>
        </table>
      </div>
    </Popup>
  );
};
