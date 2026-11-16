// ==============================================================================
// KARTU POLA SPASIAL & SEBARAN TITIK API (SPATIAL PATTERN CARD)
// ==============================================================================
// Menampilkan metrik kepadatan radius 15km, jarak tetangga terdekat, dan pola klaster.
// ==============================================================================

import React from 'react';
import { Layers, MapPin } from 'lucide-react';
import { SpatialPatternResult } from '../../utils/hotspotNarrative.utils';

interface SpatialPatternCardProps {
  pattern: SpatialPatternResult;
  totalAreaPoints: number;
  nearestKm?: number;
  lat: number;
  lng: number;
  acqDate: string;
  acqTime: string;
}

export const SpatialPatternCard: React.FC<SpatialPatternCardProps> = ({
  pattern,
  totalAreaPoints,
  nearestKm,
  lat,
  lng,
  acqDate,
  acqTime,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Pola Spasial &amp; Sebaran Titik Api
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          {pattern.type}
        </span>
      </div>

      <div className="space-y-1">
        <div className="text-[12.5px] font-extrabold text-slate-900 leading-tight">
          {pattern.title}
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          {pattern.desc}
        </p>
      </div>

      {/* Kartu Metrik Spasial */}
      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
        <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
          <div className="text-slate-500 text-[10px] font-semibold">Kepadatan Titik (15 km):</div>
          <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
            <span>{totalAreaPoints}</span>
            <span className="text-[10px] font-semibold text-slate-500">titik aktif</span>
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
          <div className="text-slate-500 text-[10px] font-semibold">Jarak Tetangga Terdekat:</div>
          <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
            <span>{nearestKm && nearestKm < 15 ? `${nearestKm}` : '> 15'}</span>
            <span className="text-[10px] font-semibold text-slate-500">km</span>
          </div>
        </div>
      </div>

      {/* Koordinat & Waktu Metadata Ringkas */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
          {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
        </span>
        <span>{acqDate} {acqTime} UTC</span>
      </div>
    </div>
  );
};
