import React, { useState } from 'react';
import { Layers, ChevronUp, ChevronDown, Info } from 'lucide-react';
import { ESRI_LAND_COVER_CLASSES } from '../constants/landCover.constants';

interface LandCoverLegendProps {
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  activeProviderName: string;
}

export const LandCoverLegend: React.FC<LandCoverLegendProps> = ({
  opacity,
  onOpacityChange,
  activeProviderName,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return (
    <div className="landcover-legend-card rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md min-w-[240px]">
      {/* Legend Title Bar */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Legenda Tutupan Lahan</span>
        </div>
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
          title={isCollapsed ? 'Buka Legenda' : 'Tutup Legenda'}
        >
          {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {!isCollapsed && (
        <div className="space-y-2">
          {/* Provider Badge */}
          <div className="flex items-center justify-between bg-emerald-50 text-emerald-800 text-[10px] px-2 py-1 rounded border border-emerald-200">
            <span className="truncate font-medium">{activeProviderName}</span>
            <span className="font-mono text-[9px] bg-emerald-200/70 px-1 rounded text-emerald-900 font-semibold">10m</span>
          </div>

          {/* Color Items Stack */}
          <div className="grid grid-cols-1 gap-1 max-h-52 overflow-y-auto pr-1">
            {Object.values(ESRI_LAND_COVER_CLASSES).map((item) => (
              <div
                key={item.value}
                className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded transition-colors"
                title={item.description}
              >
                <span
                  className="w-3.5 h-3.5 rounded shadow-sm border border-black/10 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Opacity Slider */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Info className="w-3 h-3 text-emerald-600" /> Transparansi:
              </span>
              <span className="font-mono font-bold text-emerald-600">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
};
