import React from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { ISLANDS, PROVINCES } from '../../../map/constants/regions.constants';

interface RegionFilterProps {
  selectedIsland: string;
  onIslandChange: (islandId: string) => void;
  selectedProvince: string;
  onProvinceChange: (provinceId: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

export const RegionFilter: React.FC<RegionFilterProps> = ({
  selectedIsland,
  onIslandChange,
  selectedProvince,
  onProvinceChange,
  isOpen = false,
  onToggle,
  isMobile = false,
}) => {
  const availableProvinces =
    selectedIsland === 'ALL'
      ? PROVINCES
      : selectedIsland === 'DEFAULT'
      ? PROVINCES.filter((p) => ['SUMATERA', 'KALIMANTAN', 'PAPUA'].includes(p.islandId))
      : PROVINCES.filter((p) => p.islandId === selectedIsland);

  // Label ringkas untuk tampilan tombol di desktop
  const activeIslandObj = ISLANDS.find((i) => i.id === selectedIsland);
  const activeProvObj = PROVINCES.find((p) => p.id === selectedProvince);
  const regionLabel =
    selectedProvince !== 'ALL' && activeProvObj
      ? activeProvObj.name
      : selectedIsland !== 'ALL' && selectedIsland !== 'DEFAULT' && activeIslandObj
      ? activeIslandObj.name
      : 'Wilayah';

  if (isMobile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5">
        <div className="font-bold text-slate-900 flex items-center justify-start text-xs">
          <div className="flex items-center gap-1.5 ">
            <MapPin className="h-4 w-4 text-emerald-700" />
            <span>Filter Wilayah</span>
          </div>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pulau:</label>
            <div className="relative">
              <select
                value={selectedIsland}
                onChange={(e) => onIslandChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                {ISLANDS.map((island) => (
                  <option key={island.id} value={island.id}>
                    🏝️ {island.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provinsi:</label>
            <div className="relative">
              <select
                value={selectedProvince}
                onChange={(e) => onProvinceChange(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
              >
                <option value="ALL">🏛️ Semua Provinsi</option>
                {availableProvinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    📍 {prov.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
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
        <MapPin className={`h-3.5 w-3.5 ${isOpen ? 'text-emerald-700' : 'text-emerald-300'}`} />
        <span className="truncate max-w-[120px]">{regionLabel}</span>
        <ChevronDown className="h-3 w-3 opacity-75" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100 space-y-3">
          <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100 flex items-center justify-between">
            <span>Pilih Cakupan Wilayah</span>
          </div>

          {/* Pilih Pulau */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pulau:</label>
            <div className="relative">
              <select
                value={selectedIsland}
                onChange={(e) => onIslandChange(e.target.value)}
                className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 pr-7 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer"
              >
                {ISLANDS.map((island) => (
                  <option key={island.id} value={island.id}>
                    🏝️ {island.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Pilih Provinsi */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provinsi:</label>
            <div className="relative">
              <select
                value={selectedProvince}
                onChange={(e) => onProvinceChange(e.target.value)}
                className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 pr-7 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="ALL">🏛️ Semua Provinsi</option>
                {availableProvinces.map((prov) => (
                  <option key={prov.id} value={prov.id}>
                    📍 {prov.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionFilter;
