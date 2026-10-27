import React, { useRef, useEffect } from 'react';
import { 
  Layers, 
  MapPin, 
  Calendar, 
  ChevronDown, 
  Flame, 
  CloudRain, 
  Droplets, 
  Thermometer, 
  Map as MapIcon, 
  Upload 
} from 'lucide-react';
import { SensorType } from '../../types/hotspot';
import { BasemapType } from '../constants/basemap.constants';
import { ISLANDS, PROVINCES } from '../../shared/constants/regions.constants';
import { LandCoverProvider, LAND_COVER_PROVIDERS } from '../../modules/land_cover';

interface NavbarControlsProps {
  // Basemap
  basemap: BasemapType;
  onBasemapToggle: () => void;

  // Active Dropdown state
  activeDropdown: 'layers' | 'regions' | 'calendar' | null;
  onToggleDropdown: (dropdown: 'layers' | 'regions' | 'calendar') => void;
  onCloseDropdown: () => void;

  // Layers states & handlers
  showHotspots: boolean;
  onToggleHotspots: (show: boolean) => void;
  showPeatland: boolean;
  onTogglePeatland: (show: boolean) => void;
  peatlandOnly: boolean;
  onTogglePeatlandOnly: (peatlandOnly: boolean) => void;
  showLandCover: boolean;
  onToggleLandCover: (show: boolean) => void;
  landCoverProvider: LandCoverProvider;
  onLandCoverProviderChange: (provider: LandCoverProvider) => void;
  onOpenGeoTIFFModal: () => void;
  localGeoTIFFFileName?: string | null;
  showRainfall: boolean;
  onToggleRainfall: (show: boolean) => void;
  showSoilMoisture: boolean;
  onToggleSoilMoisture: (show: boolean) => void;
  showTemperature: boolean;
  onToggleTemperature: (show: boolean) => void;

  // Regions states & handlers
  selectedIsland: string;
  onIslandChange: (islandId: string) => void;
  selectedProvince: string;
  onProvinceChange: (provinceId: string) => void;

  // Calendar states & handlers
  dateFilterMode: 'range' | 'single' | 'days';
  onDateFilterModeChange: (mode: 'range' | 'single' | 'days') => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  hotspotMode: 'markers' | 'heatmap';
  onHotspotModeChange: (mode: 'markers' | 'heatmap') => void;
}

export const NavbarControls: React.FC<NavbarControlsProps> = ({
  basemap,
  onBasemapToggle,
  activeDropdown,
  onToggleDropdown,
  onCloseDropdown,
  showHotspots,
  onToggleHotspots,
  showPeatland,
  onTogglePeatland,
  peatlandOnly,
  onTogglePeatlandOnly,
  showLandCover,
  onToggleLandCover,
  landCoverProvider,
  onLandCoverProviderChange,
  onOpenGeoTIFFModal,
  localGeoTIFFFileName,
  showRainfall,
  onToggleRainfall,
  showSoilMoisture,
  onToggleSoilMoisture,
  showTemperature,
  onToggleTemperature,
  selectedIsland,
  onIslandChange,
  selectedProvince,
  onProvinceChange,
  dateFilterMode,
  onDateFilterModeChange,
  singleDate,
  onSingleDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  hotspotMode,
  onHotspotModeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onCloseDropdown();
      }
    };
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown, onCloseDropdown]);

  const availableProvinces =
    selectedIsland === 'ALL' ? PROVINCES : PROVINCES.filter((p) => p.islandId === selectedIsland);

  const navBtnBase =
    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none';
  const navBtnIdle =
    'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20';
  const navBtnActive =
    'border-white bg-white text-slate-900 shadow-md';

  return (
    <div ref={containerRef} className="relative flex items-center gap-2">
      {/* 1. Basemap Switcher */}
      <button
        type="button"
        onClick={onBasemapToggle}
        className={`${navBtnBase} ${navBtnIdle}`}
        title={`Ganti mode peta`}
      >
        <MapIcon className="h-3.5 w-3.5 text-sky-300" />
        <span className="hidden sm:inline">Peta: {basemap === 'satellite' ? 'Satelit' : 'Polos'}</span>
      </button>

      {/* 2. Dropdown: Layer */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onToggleDropdown('layers')}
          className={`${navBtnBase} ${activeDropdown === 'layers' ? navBtnActive : navBtnIdle}`}
        >
          <Layers className={`h-3.5 w-3.5 ${activeDropdown === 'layers' ? 'text-emerald-600' : 'text-emerald-300'}`} />
          <span>Layer</span>
          <ChevronDown className="h-3 w-3 opacity-75" />
        </button>

        {activeDropdown === 'layers' && (
          <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100">
            <div className="font-bold text-slate-900 pb-2 border-b border-slate-100 mb-2">
              Pilihan Layer & Overlay
            </div>

            <div className="space-y-1.5">
              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showHotspots}
                  onChange={(e) => onToggleHotspots(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">🔥 Titik Api (Hotspots)</span>
              </label>

              {showHotspots && (
                <label className="flex items-center gap-2 pl-6 pr-2 py-1 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={peatlandOnly}
                    onChange={(e) => onTogglePeatlandOnly(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Hanya di Lahan Gambut</span>
                </label>
              )}

              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPeatland}
                  onChange={(e) => onTogglePeatland(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">🌿 Lahan Gambut (MoEF)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLandCover}
                  onChange={(e) => onToggleLandCover(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">🗺️ Tutupan Lahan (LULC)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRainfall}
                  onChange={(e) => onToggleRainfall(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">🌧️ Curah Hujan (Rainfall)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSoilMoisture}
                  onChange={(e) => onToggleSoilMoisture(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">💧 Kelembaban Tanah</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showTemperature}
                  onChange={(e) => onToggleTemperature(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="font-medium text-slate-800">🌡️ Suhu Udara (Temp)</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* 3. Dropdown: Wilayah */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onToggleDropdown('regions')}
          className={`${navBtnBase} ${activeDropdown === 'regions' ? navBtnActive : navBtnIdle}`}
        >
          <MapPin className={`h-3.5 w-3.5 ${activeDropdown === 'regions' ? 'text-blue-600' : 'text-blue-300'}`} />
          <span>
            {selectedProvince !== 'ALL'
              ? PROVINCES.find((p) => p.id === selectedProvince)?.name
              : selectedIsland !== 'ALL'
              ? ISLANDS.find((i) => i.id === selectedIsland)?.name
              : 'Wilayah'}
          </span>
          <ChevronDown className="h-3 w-3 opacity-75" />
        </button>

        {activeDropdown === 'regions' && (
          <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100 space-y-3">
            <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">
              Filter Wilayah
            </div>

            {/* Pilih Pulau */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pulau:</label>
              <select
                value={selectedIsland}
                onChange={(e) => onIslandChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {ISLANDS.map((island) => (
                  <option key={island.id} value={island.id}>
                    {island.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Provinsi */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Provinsi:</label>
              <select
                value={selectedProvince}
                onChange={(e) => onProvinceChange(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Semua Provinsi</option>
                {availableProvinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    {prov.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4. Dropdown: Date / Kalender */}
      <div className="relative">
        <button
          type="button"
          onClick={() => onToggleDropdown('calendar')}
          className={`${navBtnBase} ${activeDropdown === 'calendar' ? navBtnActive : navBtnIdle}`}
        >
          <Calendar className={`h-3.5 w-3.5 ${activeDropdown === 'calendar' ? 'text-amber-600' : 'text-amber-300'}`} />
          <span>{dateFilterMode === 'single' ? singleDate : 'Tanggal'}</span>
          <ChevronDown className="h-3 w-3 opacity-75" />
        </button>

        {activeDropdown === 'calendar' && (
          <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100 space-y-3">
            <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">
              Filter Tanggal Satelit
            </div>

            {/* Mode Visualisasi Hotspot */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tampilan Hotspot:</label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onHotspotModeChange('markers')}
                  className={`py-1 rounded border text-[11px] font-medium transition-colors ${
                    hotspotMode === 'markers'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Titik Pin
                </button>
                <button
                  type="button"
                  onClick={() => onHotspotModeChange('heatmap')}
                  className={`py-1 rounded border text-[11px] font-medium transition-colors ${
                    hotspotMode === 'heatmap'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Heatmap
                </button>
              </div>
            </div>

            {/* Mode Tanggal */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Tanggal:</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  onDateFilterModeChange('single');
                  onSingleDateChange(e.target.value);
                }}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavbarControls;
