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
        <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
          <MapPin className="h-4 w-4 text-emerald-700" />
          <span>Filter Wilayah</span>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pulau:</label>
            <select
              value={selectedIsland}
              onChange={(e) => onIslandChange(e.target.value)}
              className="w-full h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
            >
              {ISLANDS.map((island) => (
                <option key={island.id} value={island.id}>
                  {island.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Provinsi:</label>
            <select
              value={selectedProvince}
              onChange={(e) => onProvinceChange(e.target.value)}
              className="w-full h-8.5 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
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
          <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">
            Pilih Cakupan Wilayah
          </div>

          {/* Pilih Pulau */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pulau:</label>
            <select
              value={selectedIsland}
              onChange={(e) => onIslandChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
  );
};

export default RegionFilter;
