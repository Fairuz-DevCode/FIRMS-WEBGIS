import React from 'react';
import { Layers, X, Upload } from 'lucide-react';
import { LandCoverProvider, LAND_COVER_PROVIDERS } from '../../modules/land_cover';

interface LayerControlPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  showHotspots: boolean;
  onToggleHotspots: (show: boolean) => void;
  showPeatland: boolean;
  onTogglePeatland: (show: boolean) => void;
  peatlandOnly: boolean;
  onTogglePeatlandOnly: (peatlandOnly: boolean) => void;
  showLandCover: boolean;
  onToggleLandCover: (show: boolean) => void;
  showRainfall: boolean;
  onToggleRainfall: (show: boolean) => void;
  showSoilMoisture: boolean;
  onToggleSoilMoisture: (show: boolean) => void;
  showTemperature: boolean;
  onToggleTemperature: (show: boolean) => void;
  landCoverProvider: LandCoverProvider;
  onLandCoverProviderChange: (provider: LandCoverProvider) => void;
  landCoverOpacity: number;
  onLandCoverOpacityChange: (opacity: number) => void;
  onOpenGeoTIFFModal: () => void;
  localGeoTIFFFileName?: string | null;
  filteredCount?: number;
}

export const LayerControlPopover: React.FC<LayerControlPopoverProps> = ({
  isOpen,
  onClose,
  showHotspots,
  onToggleHotspots,
  showPeatland,
  onTogglePeatland,
  peatlandOnly,
  onTogglePeatlandOnly,
  showLandCover,
  onToggleLandCover,
  showRainfall,
  onToggleRainfall,
  showSoilMoisture,
  onToggleSoilMoisture,
  showTemperature,
  onToggleTemperature,
  landCoverProvider,
  onLandCoverProviderChange,
  landCoverOpacity,
  onLandCoverOpacityChange,
  onOpenGeoTIFFModal,
  localGeoTIFFFileName,
  filteredCount,
}) => {
  if (!isOpen) return null;

  return (
    <div className="max-h-[65vh] w-80 animate-popover space-y-3 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-xs text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.15)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Layers className="w-4 h-4 text-emerald-600" />
          <span>Pengaturan Layer & Overlay</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Layer Toggles */}
      <div className="space-y-2">
        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showHotspots}
            onChange={(e) => onToggleHotspots(e.target.checked)}
            className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">🔥 Titik Panas (Hotspots Overlay)</span>
        </label>

        {showHotspots && (
          <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
            <input
              type="checkbox"
              checked={peatlandOnly}
              onChange={(e) => onTogglePeatlandOnly(e.target.checked)}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
            />
            <span className="font-semibold text-slate-800">🔥 Filter Hotspot Hanya di Area Gambut</span>
          </label>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showPeatland}
            onChange={(e) => onTogglePeatland(e.target.checked)}
            className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">🌿 Kawasan Gambut (Peatland Overlay)</span>
        </label>



        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showLandCover}
            onChange={(e) => onToggleLandCover(e.target.checked)}
            className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">🗺️ Penutupan Lahan (Land Cover 10m)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showRainfall}
            onChange={(e) => onToggleRainfall(e.target.checked)}
            className="accent-sky-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">🌧️ Curah Hujan (Rainfall ERA5)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showSoilMoisture}
            onChange={(e) => onToggleSoilMoisture(e.target.checked)}
            className="accent-amber-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">💧 Kelembaban Tanah (Soil Moisture ERA5)</span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 p-2.5 rounded-xl border border-slate-200/80 transition-colors">
          <input
            type="checkbox"
            checked={showTemperature}
            onChange={(e) => onToggleTemperature(e.target.checked)}
            className="accent-red-600 w-4 h-4 rounded cursor-pointer"
          />
          <span className="font-semibold text-slate-800">🌡️ Suhu Udara (Temperature ERA5)</span>
        </label>
      </div>
    </div>
  );
};
