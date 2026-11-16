// ==============================================================================
// KARTU TIPOLOGI KEBAKARAN (FIRE TYPOLOGY CARD)
// ==============================================================================
// Menampilkan klasifikasi kebakaran (Gambut Smoldering, Hutan, Permukaan), tutupan lahan, dan risiko asap.
// ==============================================================================

import React from 'react';
import { Flame, Trees, Layers, AlertOctagon, Wind } from 'lucide-react';
import { FireTypologyResult } from '../../utils/hotspotNarrative.utils';

interface FireTypologyCardProps {
  typology: FireTypologyResult;
  isPeat: boolean;
  landCoverClass?: string;
}

export const FireTypologyCard: React.FC<FireTypologyCardProps> = ({
  typology,
  isPeat,
  landCoverClass,
}) => {
  const getIcon = () => {
    switch (typology.type) {
      case 'smoldering':
        return <AlertOctagon className="h-5 w-5 text-red-600" aria-hidden="true" />;
      case 'peat_surface':
        return <Layers className="h-5 w-5 text-orange-600" aria-hidden="true" />;
      case 'forest':
        return <Trees className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
      case 'open_land':
      default:
        return <Flame className="h-5 w-5 text-amber-600" aria-hidden="true" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 transition-all">
      <div className="flex items-center justify-between border-b border-black/5 pb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
          {getIcon()}
          Tipologi Kebakaran
        </span>
        <span className="text-[11px] font-semibold text-slate-500">
          {isPeat ? 'Kubah Gambut' : 'Tanah Mineral'}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="text-[13px] font-black text-slate-900 leading-tight">
          {typology.title}
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
          {typology.desc}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[10px] font-semibold block">Ekosistem Gambut (KHG):</span>
          <strong className={`mt-0.5 block font-bold ${isPeat ? 'text-amber-800' : 'text-slate-800'}`}>
            {isPeat ? 'Lahan Gambut' : 'Tanah Mineral'}
          </strong>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
          <span className="text-slate-500 text-[10px] font-semibold block">Tutupan Lahan (Sentinel-2):</span>
          <strong className="mt-0.5 block font-bold text-slate-800 truncate" title={landCoverClass || ''}>
            {landCoverClass || 'Memuat...'}
          </strong>
        </div>
      </div>

      {/* Indikator Risiko Emisi Asap */}
      <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10.5px]">
        <span className="font-bold text-slate-700 flex items-center gap-1">
          <Wind className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
          Risiko Asap &amp; Partikel:
        </span>
        <span className="text-[11px] font-semibold text-slate-600">
          {typology.smokeHazard}
        </span>
      </div>
    </div>
  );
};
