import React from 'react';
import { Map as MapIcon, Info, ChevronDown } from 'lucide-react';
import { BasemapType } from '../../../map/constants/basemap.constants';

interface BasemapFilterProps {
  basemap: BasemapType;
  onBasemapToggle: () => void;
  onBasemapChange?: (type: BasemapType) => void;
  onOpenInfo?: () => void;
  isMobile?: boolean;
}

export const BasemapFilter: React.FC<BasemapFilterProps> = ({
  basemap,
  onBasemapToggle,
  onBasemapChange,
  onOpenInfo,
  isMobile = false,
}) => {
  const handleChange = (newBasemap: BasemapType) => {
    if (onBasemapChange) {
      onBasemapChange(newBasemap);
    } else {
      if (newBasemap !== basemap) onBasemapToggle();
    }
  };

  if (isMobile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
        <div className="font-bold text-slate-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <MapIcon className="h-4 w-4 text-emerald-700" />
            <span>Tampilan Peta Dasar (Basemap)</span>
          </div>
          {onOpenInfo && (
            <button
              type="button"
              onClick={onOpenInfo}
              className="p-1 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
              title="Informasi Sumber Peta Dasar"
            >
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative">
          <select
            value={basemap}
            onChange={(e) => handleChange(e.target.value as BasemapType)}
            className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
          >
            <option value="satellite">🛰️ Citra Satelit (Esri World Imagery)</option>
            <option value="light_gray">🗺️ Peta Polos (Esri Light Gray)</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={basemap}
        onChange={(e) => handleChange(e.target.value as BasemapType)}
        className="h-8 rounded-lg border border-white/20 bg-white/10 text-white px-2.5 pr-7 text-xs font-semibold hover:border-white/40 hover:bg-white/20 transition-all cursor-pointer appearance-none shadow-xs focus:outline-none"
        title="Ganti mode peta dasar"
      >
        <option value="satellite" className="bg-slate-800 text-white">🛰️ Peta: Satelit</option>
        <option value="light_gray" className="bg-slate-800 text-white">🗺️ Peta: Polos</option>
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70 pointer-events-none" />
    </div>
  );
};

export default BasemapFilter;
