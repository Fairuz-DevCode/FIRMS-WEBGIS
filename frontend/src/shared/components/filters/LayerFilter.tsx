import React, { useState } from 'react';
import { 
  Layers, 
  ChevronDown, 
  Flame, 
  Trees, 
  Map as MapIcon, 
  CloudRain, 
  Droplets, 
  Thermometer, 
  Info,
  X
} from 'lucide-react';
import { ESRI_LAND_COVER_CLASSES } from '../../../modules/land_cover/constants/landCover.constants';
import { RAINFALL_SCALES, SOIL_MOISTURE_SCALES, TEMPERATURE_SCALES } from '../../../map/constants/climate.constants';
import { BasemapType } from '../../../map/constants/basemap.constants';

export type LayerInfoType = 
  | 'hotspots' 
  | 'peatland_only' 
  | 'peatland' 
  | 'land_cover' 
  | 'rainfall' 
  | 'soil_moisture' 
  | 'temperature' 
  | 'basemap';

interface LayerFilterProps {
  showHotspots: boolean;
  onToggleHotspots: (show: boolean) => void;
  showPeatland: boolean;
  onTogglePeatland: (show: boolean) => void;
  peatlandOnly: boolean;
  onTogglePeatlandOnly: (val: boolean) => void;
  showLandCover: boolean;
  onToggleLandCover: (show: boolean) => void;
  showRainfall: boolean;
  onToggleRainfall: (show: boolean) => void;
  showSoilMoisture: boolean;
  onToggleSoilMoisture: (show: boolean) => void;
  showTemperature: boolean;
  onToggleTemperature: (show: boolean) => void;
  landCoverOpacity?: number;
  onLandCoverOpacityChange?: (val: number) => void;
  rainfallOpacity?: number;
  onRainfallOpacityChange?: (val: number) => void;
  soilMoistureOpacity?: number;
  onSoilMoistureOpacityChange?: (val: number) => void;
  temperatureOpacity?: number;
  onTemperatureOpacityChange?: (val: number) => void;
  hotspotsCount?: number;
  basemap?: BasemapType;
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
  activeLayerInfo?: LayerInfoType | null;
  onActiveLayerInfoChange?: (info: LayerInfoType | null) => void;
}

export const LayerFilter: React.FC<LayerFilterProps> = ({
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
  landCoverOpacity = 0.5,
  onLandCoverOpacityChange,
  rainfallOpacity = 0.5,
  onRainfallOpacityChange,
  soilMoistureOpacity = 0.5,
  onSoilMoistureOpacityChange,
  temperatureOpacity = 0.5,
  onTemperatureOpacityChange,
  hotspotsCount,
  basemap = 'satellite',
  isOpen = false,
  onToggle,
  isMobile = false,
  activeLayerInfo: externalActiveLayerInfo,
  onActiveLayerInfoChange,
}) => {
  const [internalLayerInfo, setInternalLayerInfo] = useState<LayerInfoType | null>(null);
  const activeLayerInfo = externalActiveLayerInfo !== undefined ? externalActiveLayerInfo : internalLayerInfo;
  const setActiveLayerInfo = (val: LayerInfoType | null) => {
    if (onActiveLayerInfoChange) onActiveLayerInfoChange(val);
    setInternalLayerInfo(val);
  };

  const activeLayersCount = [
    showHotspots,
    showPeatland,
    showLandCover,
    showRainfall,
    showSoilMoisture,
    showTemperature
  ].filter(Boolean).length;

  const layerItems = [
    {
      id: 'hotspots' as LayerInfoType,
      label: 'Titik Api (Hotspots)',
      icon: <Flame className="h-4 w-4 text-orange-500 shrink-0" />,
      checked: showHotspots,
      onToggle: () => onToggleHotspots(!showHotspots),
    },
    ...(showHotspots
      ? [
          {
            id: 'peatland_only' as LayerInfoType,
            label: 'Hanya di Lahan Gambut',
            icon: <Trees className="h-4 w-4 text-emerald-600 shrink-0" />,
            checked: peatlandOnly,
            onToggle: () => onTogglePeatlandOnly(!peatlandOnly),
          },
        ]
      : []),
    {
      id: 'peatland' as LayerInfoType,
      label: 'Lahan Gambut (GFW)',
      icon: <Trees className="h-4 w-4 text-emerald-600 shrink-0" />,
      checked: showPeatland,
      onToggle: () => onTogglePeatland(!showPeatland),
    },
    {
      id: 'land_cover' as LayerInfoType,
      label: 'Tutupan Lahan (Sentinel-2)',
      icon: <MapIcon className="h-4 w-4 text-green-600 shrink-0" />,
      checked: showLandCover,
      onToggle: () => onToggleLandCover(!showLandCover),
    },
    {
      id: 'rainfall' as LayerInfoType,
      label: 'Curah Hujan (Rainfall)',
      icon: <CloudRain className="h-4 w-4 text-sky-500 shrink-0" />,
      checked: showRainfall,
      onToggle: () => onToggleRainfall(!showRainfall),
    },
    {
      id: 'soil_moisture' as LayerInfoType,
      label: 'Kelembaban Tanah',
      icon: <Droplets className="h-4 w-4 text-blue-500 shrink-0" />,
      checked: showSoilMoisture,
      onToggle: () => onToggleSoilMoisture(!showSoilMoisture),
    },
    {
      id: 'temperature' as LayerInfoType,
      label: 'Suhu Udara (Temp)',
      icon: <Thermometer className="h-4 w-4 text-orange-500 shrink-0" />,
      checked: showTemperature,
      onToggle: () => onToggleTemperature(!showTemperature),
    },
  ];

  return (
    <>
      {isMobile ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <div className="font-bold text-slate-900 flex items-center justify-between text-xs pb-1 border-b border-slate-200">
            <div className="flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-emerald-700" />
              <span>Layer & Parameter Spasial</span>
            </div>
            <span className="text-[10px] text-slate-500 font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
              {activeLayersCount} Aktif
            </span>
          </div>

          <div className="space-y-1.5 pt-0.5">
            {layerItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:bg-slate-50 transition-colors"
              >
                <div
                  onClick={item.onToggle}
                  className="flex items-center gap-2 flex-1 cursor-pointer select-none"
                >
                  {item.icon}
                  <span className="font-semibold text-slate-800 text-xs">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveLayerInfo(item.id);
                    }}
                    className="p-1 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all"
                    title={`Informasi ${item.label}`}
                  >
                    <Info className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={item.onToggle}
                    className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={onToggle}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all select-none shadow-xs ${
              isOpen
                ? 'border-white bg-white text-slate-900 shadow-md'
                : 'border-white/20 bg-white/10 text-white hover:border-white/40 hover:bg-white/20'
            }`}
          >
            <Layers className={`h-3.5 w-3.5 ${isOpen ? 'text-emerald-700' : 'text-emerald-300'}`} />
            <span>Layer</span>
            <span className="text-[10px] bg-emerald-500/30 text-emerald-100 px-1.5 py-0.2 rounded-full font-bold">
              {activeLayersCount}
            </span>
            <ChevronDown className="h-3 w-3 opacity-75" />
          </button>

          {isOpen && (
            <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100">
              <div className="font-bold text-slate-900 pb-2 border-b border-slate-100 mb-2 flex items-center justify-between">
                <span>Pilihan Layer & Parameter</span>
                <span className="text-[10px] text-slate-400 font-normal">Klik (i) utk info</span>
              </div>

              <div className="space-y-1">
                {layerItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <label className="flex items-center gap-2 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={item.onToggle}
                        className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <span className="font-medium text-slate-800 text-xs flex items-center gap-1.5">
                        {item.icon}
                        {item.label}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveLayerInfo(item.id)}
                      className="p-1 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                      title={`Informasi ${item.label}`}
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pop-up Modal Informasi Sumber Layer */}
      {activeLayerInfo && (
        <div 
          className="fixed inset-0 z-[2500] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveLayerInfo(null)}
        >
          <div 
            className="w-[88vw] max-w-xs rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">
                  {activeLayerInfo === 'basemap' && 'Peta Dasar (Basemap)'}
                  {activeLayerInfo === 'hotspots' && 'Titik Api (NASA FIRMS)'}
                  {activeLayerInfo === 'peatland_only' && 'Filter: Lahan Gambut'}
                  {activeLayerInfo === 'peatland' && 'Lahan Gambut (Global Forest Watch)'}
                  {activeLayerInfo === 'land_cover' && 'Tutupan Lahan (Sentinel-2)'}
                  {activeLayerInfo === 'rainfall' && 'Curah Hujan (Rainfall)'}
                  {activeLayerInfo === 'soil_moisture' && 'Kelembaban Tanah'}
                  {activeLayerInfo === 'temperature' && 'Suhu Udara (2m)'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveLayerInfo(null)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                title="Tutup pop-up"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 space-y-3 overflow-y-auto text-[11px] text-slate-600 max-h-[60vh]">
              {/* Basemap Info */}
              {activeLayerInfo === 'basemap' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Peta dasar resolusi tinggi dunia yang menampilkan citra satelit dan batas wilayah geografis.
                  </p>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                    <div className="font-semibold text-slate-800 text-[10px]">Tipe Peta Aktif:</div>
                    <div className="text-slate-700 font-medium">
                      {basemap === 'satellite' ? '🛰️ Esri World Imagery (Citra Satelit)' : '🗺️ Esri Light Gray Canvas (Polos)'}
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Esri (World Imagery & Canvas)</span>
                  </div>
                </div>
              )}

              {/* Hotspots Info */}
              {activeLayerInfo === 'hotspots' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Deteksi anomali termal permukaan bumi oleh satelit NASA FIRMS menggunakan sensor VIIRS (Suomi NPP & NOAA-20) dengan resolusi spasial 375m.
                  </p>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 p-2 space-y-1.5">
                    <div className="font-bold text-[11px] text-slate-800">Tingkat Kepercayaan (Confidence):</div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0" />
                      <span className="font-medium text-slate-700">Rendah (&lt; 30%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 shrink-0" />
                      <span className="font-medium text-slate-700">Sedang (30% - 80%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-500 shrink-0" />
                      <span className="font-medium text-slate-700">Tinggi (&gt; 80%)</span>
                    </div>
                  </div>
                  {hotspotsCount !== undefined && (
                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold pt-0.5">
                      <span>Total hotspot terdeteksi:</span>
                      <span className="font-mono text-slate-800 font-bold">{hotspotsCount} titik</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">NASA FIRMS (Suomi NPP & NOAA-20)</span>
                  </div>
                </div>
              )}

              {/* Peatland Only Filter Info */}
              {activeLayerInfo === 'peatland_only' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Menyaring tampilan titik api agar hanya memunculkan hotspot yang berada di dalam polygon lahan gambut.
                  </p>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/70 p-2 space-y-1">
                    <div className="font-bold text-[11px] text-amber-900">Tujuan Filter:</div>
                    <p className="text-[10px] text-amber-800 leading-normal">
                      Memudahkan identifikasi dini potensi kebakaran bawah permukaan (smouldering) pada lapisan gambut yang sulit dipadamkan dan melepaskan emisi karbon masif.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">NASA FIRMS x Global Forest Watch (GFW)</span>
                  </div>
                </div>
              )}

              {/* Peatland Info */}
              {activeLayerInfo === 'peatland' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Peta sebaran ekosistem lahan gambut (Indonesia peat lands) dari Global Forest Watch (GFW) / Global Nature Watch.
                  </p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-[11px] text-emerald-900">
                    <span className="h-3 w-3 rounded border border-emerald-600 bg-emerald-300/40 shrink-0" />
                    <span>Area Ekosistem Lahan Gambut</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Area gambut memiliki risiko kebakaran bawah permukaan (smouldering) yang sulit dipadamkan dan melepaskan emisi karbon tinggi.
                  </p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Global Forest Watch (GFW)</span>
                  </div>
                </div>
              )}

              {/* Land Cover Info & Legend */}
              {activeLayerInfo === 'land_cover' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Klasifikasi tutupan lahan 10 meter berbasis citra Sentinel-2 (Esri Sentinel-2 Land Cover Explorer / Living Atlas & Impact Observatory).
                  </p>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {Object.values(ESRI_LAND_COVER_CLASSES).map((item) => (
                      <div key={item.value} className="flex items-center gap-2 text-[10px]">
                        <span
                          className="h-2.5 w-2.5 rounded shrink-0 border border-black/10"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-slate-700 truncate">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  {onLandCoverOpacityChange && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                        <span>Transparansi Layer</span>
                        <span className="font-mono text-emerald-700 font-bold">{Math.round(landCoverOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={landCoverOpacity}
                        onChange={(e) => onLandCoverOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Esri Sentinel-2 Land Cover</span>
                  </div>
                </div>
              )}

              {/* Rainfall Info & Legend */}
              {activeLayerInfo === 'rainfall' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Akumulasi curah hujan harian (total precipitation) berbasis model reanalisis atmosfer ERA5-Land dari Copernicus Climate Change Service (ECMWF).
                  </p>
                  <div className="space-y-1">
                    {RAINFALL_SCALES.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span
                          className="h-2.5 w-2.5 rounded shrink-0 border border-black/10"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-mono font-semibold text-slate-700 min-w-[55px]">{s.label}</span>
                        <span className="text-slate-500 font-medium truncate">({s.category})</span>
                      </div>
                    ))}
                  </div>
                  {onRainfallOpacityChange && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                        <span>Transparansi Layer</span>
                        <span className="font-mono text-sky-700 font-bold">{Math.round(rainfallOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={rainfallOpacity}
                        onChange={(e) => onRainfallOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Copernicus ECMWF (ERA5-Land)</span>
                  </div>
                </div>
              )}

              {/* Soil Moisture Info & Legend */}
              {activeLayerInfo === 'soil_moisture' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Kadar air volumetrik lapisan tanah atas 0-7 cm (volumetric soil water layer 1) berbasis model reanalisis ERA5-Land dari Copernicus Climate Change Service (ECMWF).
                  </p>
                  <div className="space-y-1">
                    {SOIL_MOISTURE_SCALES.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span
                          className="h-2.5 w-2.5 rounded shrink-0 border border-black/10"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-mono font-semibold text-slate-700 min-w-[75px]">{s.label}</span>
                        <span className="text-slate-500 font-medium truncate">({s.category})</span>
                      </div>
                    ))}
                  </div>
                  {onSoilMoistureOpacityChange && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                        <span>Transparansi Layer</span>
                        <span className="font-mono text-blue-700 font-bold">{Math.round(soilMoistureOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={soilMoistureOpacity}
                        onChange={(e) => onSoilMoistureOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Copernicus ECMWF (ERA5-Land)</span>
                  </div>
                </div>
              )}

              {/* Temperature Info & Legend */}
              {activeLayerInfo === 'temperature' && (
                <div className="space-y-2.5">
                  <p className="leading-relaxed text-slate-600">
                    Temperatur udara 2 meter di atas permukaan tanah (2m temperature) berbasis model reanalisis atmosfer ERA5-Land dari Copernicus Climate Change Service (ECMWF).
                  </p>
                  <div className="space-y-1">
                    {TEMPERATURE_SCALES.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px]">
                        <span
                          className="h-2.5 w-2.5 rounded shrink-0 border border-black/10"
                          style={{ backgroundColor: s.color }}
                        />
                        <span className="font-mono font-semibold text-slate-700 min-w-[55px]">{s.label}</span>
                        <span className="text-slate-500 font-medium truncate">({s.category})</span>
                      </div>
                    ))}
                  </div>
                  {onTemperatureOpacityChange && (
                    <div className="pt-2 border-t border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700">
                        <span>Transparansi Layer</span>
                        <span className="font-mono text-orange-700 font-bold">{Math.round(temperatureOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={temperatureOpacity}
                        onChange={(e) => onTemperatureOpacityChange(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
                      />
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-700">Sumber Data:</span>
                    <span className="font-medium text-slate-600 text-right">Copernicus ECMWF (ERA5-Land)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveLayerInfo(null)}
                className="w-full py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 active:scale-98 transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LayerFilter;
