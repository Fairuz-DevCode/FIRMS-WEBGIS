import React, { useRef, useEffect, useState } from 'react';
import { Menu, X, Radio, ChevronDown } from 'lucide-react';
import { BasemapType } from '../../map/constants/basemap.constants';
import { LandCoverProvider } from '../../modules/land_cover';
import { SensorType } from '../../modules/hotspot/types/hotspot.types';
import { BasemapFilter } from './filters/BasemapFilter';
import { LayerFilter, LayerInfoType } from './filters/LayerFilter';
import { RegionFilter } from './filters/RegionFilter';
import { DateFilter } from './filters/DateFilter';

export interface NavbarProps {
  // Basemap
  basemap: BasemapType;
  onBasemapToggle: () => void;
  onBasemapChange?: (type: BasemapType) => void;

  // NASA FIRMS Satellite Sensor
  sensor?: SensorType;
  onSensorChange?: (sensor: SensorType) => void;

  // Dropdown States
  activeDropdown: 'layers' | 'regions' | 'calendar' | null;
  onToggleDropdown: (dropdown: 'layers' | 'regions' | 'calendar') => void;
  onCloseDropdown: () => void;

  // Layer Toggles
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

  // Layer Opacities
  landCoverOpacity?: number;
  onLandCoverOpacityChange?: (val: number) => void;
  rainfallOpacity?: number;
  onRainfallOpacityChange?: (val: number) => void;
  soilMoistureOpacity?: number;
  onSoilMoistureOpacityChange?: (val: number) => void;
  temperatureOpacity?: number;
  onTemperatureOpacityChange?: (val: number) => void;
  hotspotsCount?: number;

  // Regions
  selectedIsland: string;
  onIslandChange: (islandId: string) => void;
  selectedProvince: string;
  onProvinceChange: (provinceId: string) => void;

  // Calendar & Hotspot Mode
  dateFilterMode: 'range' | 'single' | 'days';
  onDateFilterModeChange: (mode: 'range' | 'single' | 'days') => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate?: string;
  onStartDateChange?: (date: string) => void;
  endDate?: string;
  onEndDateChange?: (date: string) => void;
  hotspotMode: 'markers' | 'heatmap';
  onHotspotModeChange: (mode: 'markers' | 'heatmap') => void;
}

export const Navbar: React.FC<NavbarProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLayerInfo, setActiveLayerInfo] = useState<LayerInfoType | null>(null);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        props.onCloseDropdown();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [props.activeDropdown, props.onCloseDropdown]);

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  return (
    <header className="z-[2000] flex h-10 md:h-12 lg:h-16 shrink-0 select-none items-center justify-between border-b border-white/15 bg-gradient-to-r from-prims-900 via-prims-700 to-prims-800 px-3 sm:px-5 text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
      {/* 1. Sisi Kiri: Logo PRIMS & Judul */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-display text-[1.25rem] font-extrabold tracking-wider text-white">
            PRIMS
          </span>
        </div>

        <div className="mx-1 h-6 w-px bg-white/25 hidden xl:block" />

        <div className="hidden xl:flex items-center gap-2">
          <h1 className="whitespace-nowrap font-display text-[0.92rem] font-semibold text-green-50">
            Pemantauan Gambut & Analisis Data Karhutla
          </h1>
        </div>
      </div>

      {/* 2. Sisi Kanan: Kontrol Filter & Navigasi */}
      <div ref={containerRef} className="relative flex items-center">
        {/* Tombol Hamburger di Layar HP & Tablet/iPad (< lg) */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex items-center gap-2 py-1.5 text-white hover:bg-white/20 active:scale-95 transition-all text-xs font-semibold"
            title="Buka menu filter dan layer"
          >
            <Menu className="h-6 w-6 text-emerald-300" />
          </button>
        </div>

        {/* Tombol Sejajar di Layar Desktop (>= lg) */}
        <div className="hidden lg:flex items-center gap-2">
          <BasemapFilter
            basemap={props.basemap}
            onBasemapToggle={props.onBasemapToggle}
            onBasemapChange={props.onBasemapChange}
          />

          {props.sensor && props.onSensorChange && (
            <div className="relative">
              <select
                value={props.sensor}
                onChange={(e) => props.onSensorChange?.(e.target.value as SensorType)}
                className="h-8 rounded-lg border border-white/20 bg-white/10 text-white px-2.5 pr-7 text-xs font-semibold hover:border-white/40 hover:bg-white/20 transition-all cursor-pointer appearance-none shadow-xs focus:outline-none"
                title="Pilih Sensor Satelit NASA FIRMS"
              >
                <option value="ALL" className="bg-slate-800 text-white">🛰️ Semua Satelit (Default)</option>
                <option value="VIIRS_SNPP_NRT" className="bg-slate-800 text-white">🛰️ VIIRS S-NPP (375m)</option>
                <option value="VIIRS_NOAA20_NRT" className="bg-slate-800 text-white">🛰️ VIIRS NOAA-20 (375m)</option>
                <option value="VIIRS_NOAA21_NRT" className="bg-slate-800 text-white">🛰️ VIIRS NOAA-21 (375m)</option>
                <option value="MODIS_NRT" className="bg-slate-800 text-white">🛰️ MODIS Terra/Aqua (1km)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/70 pointer-events-none" />
            </div>
          )}

          <LayerFilter
            showHotspots={props.showHotspots}
            onToggleHotspots={props.onToggleHotspots}
            showPeatland={props.showPeatland}
            onTogglePeatland={props.onTogglePeatland}
            peatlandOnly={props.peatlandOnly}
            onTogglePeatlandOnly={props.onTogglePeatlandOnly}
            showLandCover={props.showLandCover}
            onToggleLandCover={props.onToggleLandCover}
            showRainfall={props.showRainfall}
            onToggleRainfall={props.onToggleRainfall}
            showSoilMoisture={props.showSoilMoisture}
            onToggleSoilMoisture={props.onToggleSoilMoisture}
            showTemperature={props.showTemperature}
            onToggleTemperature={props.onToggleTemperature}
            landCoverOpacity={props.landCoverOpacity}
            onLandCoverOpacityChange={props.onLandCoverOpacityChange}
            rainfallOpacity={props.rainfallOpacity}
            onRainfallOpacityChange={props.onRainfallOpacityChange}
            soilMoistureOpacity={props.soilMoistureOpacity}
            onSoilMoistureOpacityChange={props.onSoilMoistureOpacityChange}
            temperatureOpacity={props.temperatureOpacity}
            onTemperatureOpacityChange={props.onTemperatureOpacityChange}
            hotspotsCount={props.hotspotsCount}
            basemap={props.basemap}
            isOpen={props.activeDropdown === 'layers'}
            onToggle={() => props.onToggleDropdown('layers')}
            activeLayerInfo={activeLayerInfo}
            onActiveLayerInfoChange={setActiveLayerInfo}
          />

          <RegionFilter
            selectedIsland={props.selectedIsland}
            onIslandChange={props.onIslandChange}
            selectedProvince={props.selectedProvince}
            onProvinceChange={props.onProvinceChange}
            isOpen={props.activeDropdown === 'regions'}
            onToggle={() => props.onToggleDropdown('regions')}
          />

          <DateFilter
            dateFilterMode={props.dateFilterMode}
            onDateFilterModeChange={props.onDateFilterModeChange}
            singleDate={props.singleDate}
            onSingleDateChange={props.onSingleDateChange}
            hotspotMode={props.hotspotMode}
            onHotspotModeChange={props.onHotspotModeChange}
            isOpen={props.activeDropdown === 'calendar'}
            onToggle={() => props.onToggleDropdown('calendar')}
          />
        </div>

        {/* 3. Drawer Menu Slide-Over di Layar HP & Tablet (< lg) */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-[3000] bg-slate-950/60 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
              onClick={() => setMobileMenuOpen(false)}
            />

            <div className="fixed inset-y-0 right-0 z-[3100] w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col lg:hidden animate-in slide-in-from-right duration-250">
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-900/30 bg-gradient-to-r from-prims-900 via-prims-800 to-prims-900 text-white shrink-0">
                <span className="font-bold text-sm">Pengaturan & Filter Peta</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-emerald-200 hover:bg-white/10 hover:text-white transition-colors"
                  title="Tutup Menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs text-slate-800">
                {/* Filter 1: Basemap */}
                <BasemapFilter
                  basemap={props.basemap}
                  onBasemapToggle={props.onBasemapToggle}
                  onBasemapChange={props.onBasemapChange}
                  onOpenInfo={() => setActiveLayerInfo('basemap')}
                  isMobile={true}
                />

                {/* Filter Satelit Sensor NASA FIRMS */}
                {props.sensor && props.onSensorChange && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                    <div className="font-bold text-slate-900 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Radio className="h-4 w-4 text-emerald-700" />
                        <span>Satelit Sensor (NASA FIRMS)</span>
                      </div>
                      <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-200">
                        Aktif
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={props.sensor}
                        onChange={(e) => props.onSensorChange?.(e.target.value as SensorType)}
                        className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
                      >
                        <option value="ALL">🛰️ Semua Satelit (Default)</option>
                        <option value="VIIRS_SNPP_NRT">🛰️ VIIRS S-NPP (375m)</option>
                        <option value="VIIRS_NOAA20_NRT">🛰️ VIIRS NOAA-20 (375m)</option>
                        <option value="VIIRS_NOAA21_NRT">🛰️ VIIRS NOAA-21 (375m)</option>
                        <option value="MODIS_NRT">🛰️ MODIS Terra / Aqua (1km)</option>
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                )}

                {/* Filter 2: Date & Hotspot Mode */}
                <DateFilter
                  dateFilterMode={props.dateFilterMode}
                  onDateFilterModeChange={props.onDateFilterModeChange}
                  singleDate={props.singleDate}
                  onSingleDateChange={props.onSingleDateChange}
                  hotspotMode={props.hotspotMode}
                  onHotspotModeChange={props.onHotspotModeChange}
                  isMobile={true}
                />

                {/* Filter 3: Region */}
                <RegionFilter
                  selectedIsland={props.selectedIsland}
                  onIslandChange={props.onIslandChange}
                  selectedProvince={props.selectedProvince}
                  onProvinceChange={props.onProvinceChange}
                  isMobile={true}
                />

                {/* Filter 4: Layers */}
                <LayerFilter
                  showHotspots={props.showHotspots}
                  onToggleHotspots={props.onToggleHotspots}
                  showPeatland={props.showPeatland}
                  onTogglePeatland={props.onTogglePeatland}
                  peatlandOnly={props.peatlandOnly}
                  onTogglePeatlandOnly={props.onTogglePeatlandOnly}
                  showLandCover={props.showLandCover}
                  onToggleLandCover={props.onToggleLandCover}
                  showRainfall={props.showRainfall}
                  onToggleRainfall={props.onToggleRainfall}
                  showSoilMoisture={props.showSoilMoisture}
                  onToggleSoilMoisture={props.onToggleSoilMoisture}
                  showTemperature={props.showTemperature}
                  onToggleTemperature={props.onToggleTemperature}
                  landCoverOpacity={props.landCoverOpacity}
                  onLandCoverOpacityChange={props.onLandCoverOpacityChange}
                  rainfallOpacity={props.rainfallOpacity}
                  onRainfallOpacityChange={props.onRainfallOpacityChange}
                  soilMoistureOpacity={props.soilMoistureOpacity}
                  onSoilMoistureOpacityChange={props.onSoilMoistureOpacityChange}
                  temperatureOpacity={props.temperatureOpacity}
                  onTemperatureOpacityChange={props.onTemperatureOpacityChange}
                  hotspotsCount={props.hotspotsCount}
                  basemap={props.basemap}
                  isMobile={true}
                  activeLayerInfo={activeLayerInfo}
                  onActiveLayerInfoChange={setActiveLayerInfo}
                />
              </div>

              {/* Drawer Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-prims-900 to-prims-800 text-white font-bold text-xs shadow-md active:scale-98 transition-all hover:brightness-110"
                >
                  Terapkan & Lihat Peta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Navbar;
