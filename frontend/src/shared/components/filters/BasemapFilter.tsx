import React from 'react';
import { Map as MapIcon, Info } from 'lucide-react';
import { BasemapType } from '../../../map/constants/basemap.constants';

interface BasemapFilterProps {
  basemap: BasemapType;
  onBasemapToggle: () => void;
  onOpenInfo?: () => void;
  isMobile?: boolean;
}

export const BasemapFilter: React.FC<BasemapFilterProps> = ({
  basemap,
  onBasemapToggle,
  onOpenInfo,
  isMobile = false,
}) => {
  if (isMobile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
          <MapIcon className="h-4 w-4 text-emerald-700" />
          <span>Tampilan Peta Dasar (Basemap)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBasemapToggle}
            className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              basemap === 'satellite'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>{basemap === 'satellite' ? '🛰️ Esri World Imagery (Satelit)' : '🗺️ Esri Light Gray (Polos)'}</span>
          </button>
          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Informasi Sumber Peta Dasar"
            >
              <Info className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onBasemapToggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 text-xs font-semibold transition-all select-none shadow-xs"
      title="Ganti mode peta dasar"
    >
      <MapIcon className="h-3.5 w-3.5 text-emerald-300" />
      <span>Peta: {basemap === 'satellite' ? 'Satelit' : 'Polos'}</span>
    </button>
  );
};

export default BasemapFilter;
