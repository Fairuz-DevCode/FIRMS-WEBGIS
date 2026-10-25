import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Info } from 'lucide-react';
import { ClimateType } from './ClimateLayer';
import { RAINFALL_SCALES, SOIL_MOISTURE_SCALES, TEMPERATURE_SCALES, ClimateLegendCategory } from '../../shared/constants/climate.constants';

interface ClimateLegendProps {
  type: ClimateType;
  opacity: number;
  onOpacityChange: (opacity: number) => void;
  onClose?: () => void;
}

export const ClimateLegend: React.FC<ClimateLegendProps> = ({
  type,
  opacity,
  onOpacityChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  let title = '';
  let unit = '';
  let scales: ClimateLegendCategory[] = [];
  let accentColorClass = 'text-sky-600';
  let accentRangeClass = 'accent-sky-600';

  if (type === 'rainfall') {
    title = '🌧️ Curah Hujan';
    unit = 'mm';
    scales = RAINFALL_SCALES;
    accentColorClass = 'text-sky-600';
    accentRangeClass = 'accent-sky-600';
  } else if (type === 'soil_moisture') {
    title = '💧 Kelembaban Tanah';
    unit = 'm³/m³';
    scales = SOIL_MOISTURE_SCALES;
    accentColorClass = 'text-cyan-600';
    accentRangeClass = 'accent-cyan-600';
  } else if (type === 'temperature') {
    title = '🌡️ Suhu Udara';
    unit = '°C';
    scales = TEMPERATURE_SCALES;
    accentColorClass = 'text-orange-600';
    accentRangeClass = 'accent-orange-600';
  }

  return (
    <div className="climate-legend-card rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs text-slate-800 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md min-w-[240px]">
      {/* Title Bar with Collapse Button */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200">
        <div className="flex items-center gap-1.5 font-bold text-slate-900">
          <span>{title}</span>
          <span className="text-[10px] text-slate-400 font-mono">[{unit}]</span>
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
          {/* Color Items Stack */}
          <div className="space-y-1.5">
            {scales.map((s, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px]">
                <span
                  className="w-3.5 h-3.5 rounded shadow-sm border border-black/10 shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-mono font-semibold text-slate-700 min-w-[70px]">{s.label}</span>
                <span className="text-slate-500 font-medium truncate">({s.category})</span>
              </div>
            ))}
          </div>

          {/* Opacity Slider matching LandCoverLegend */}
          <div className="pt-2 border-t border-slate-200 space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-600">
              <span className="flex items-center gap-1 font-medium">
                <Info className={`w-3 h-3 ${accentColorClass}`} /> Transparansi:
              </span>
              <span className={`font-mono font-bold ${accentColorClass}`}>{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={opacity}
              onChange={(e) => onOpacityChange(parseFloat(e.target.value))}
              className={`w-full ${accentRangeClass} h-1.5 bg-slate-200 rounded-lg cursor-pointer`}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ClimateLegend;
