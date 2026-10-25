import React, { useState } from 'react';
import { Calendar, X, Globe, Search, Layers, Flame } from 'lucide-react';
import { SensorType as HotspotSensorType } from '../../types/hotspot';
import { ISLANDS, PROVINCES } from '../../shared/constants/regions.constants';

interface CalendarFilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  sensor: HotspotSensorType;
  onSensorChange: (sensor: HotspotSensorType) => void;
  hotspotMode: 'markers' | 'heatmap';
  onHotspotModeChange: (mode: 'markers' | 'heatmap') => void;
  dayRange: number;
  onDayRangeChange: (days: number) => void;
  dateFilterMode: 'range' | 'single' | 'days';
  onDateFilterModeChange: (mode: 'range' | 'single' | 'days') => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  startDate: string;
  onStartDateChange: (date: string) => void;
  endDate: string;
  onEndDateChange: (date: string) => void;
  selectedIsland: string;
  onIslandChange: (islandId: string) => void;
  selectedProvince: string;
  onProvinceChange: (provinceId: string) => void;
}

export const CalendarFilterPopover: React.FC<CalendarFilterPopoverProps> = ({
  isOpen,
  onClose,
  sensor,
  onSensorChange,
  hotspotMode,
  onHotspotModeChange,
  dateFilterMode,
  onDateFilterModeChange,
  singleDate,
  onSingleDateChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  selectedIsland,
  onIslandChange,
  selectedProvince,
  onProvinceChange,
}) => {
  // Local state for staged edits until user clicks "Search"
  const [localIsland, setLocalIsland] = useState<string>(selectedIsland);
  const [localProvince, setLocalProvince] = useState<string>(selectedProvince);
  const [localSensor, setLocalSensor] = useState<HotspotSensorType>(sensor);
  const [localMode, setLocalMode] = useState<'markers' | 'heatmap'>(hotspotMode);
  const [localFilterMode, setLocalFilterMode] = useState<'range' | 'single' | 'days'>(dateFilterMode);
  const [localSingleDate, setLocalSingleDate] = useState<string>(singleDate);
  const [localStartDate, setLocalStartDate] = useState<string>(startDate);
  const [localEndDate, setLocalEndDate] = useState<string>(endDate);

  // Sync local states if popover opens with new props
  React.useEffect(() => {
    if (isOpen) {
      setLocalIsland(selectedIsland);
      setLocalProvince(selectedProvince);
      setLocalSensor(sensor);
      setLocalMode(hotspotMode);
      setLocalFilterMode(dateFilterMode);
      setLocalSingleDate(singleDate);
      setLocalStartDate(startDate);
      setLocalEndDate(endDate);
    }
  }, [isOpen, selectedIsland, selectedProvince, sensor, hotspotMode, dateFilterMode, singleDate, startDate, endDate]);

  if (!isOpen) return null;

  const availableProvinces =
    localIsland === 'ALL' ? PROVINCES : PROVINCES.filter((p) => p.islandId === localIsland);

  const handleApplySearch = () => {
    onIslandChange(localIsland);
    onProvinceChange(localProvince);
    onSensorChange(localSensor);
    onHotspotModeChange(localMode);
    onDateFilterModeChange(localFilterMode);
    onSingleDateChange(localSingleDate);
    onStartDateChange(localStartDate);
    onEndDateChange(localEndDate);
    onClose();
  };

  return (
    <div className="max-h-[78vh] w-72 animate-popover space-y-3.5 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-4 text-xs text-slate-800 shadow-[0_12px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Filter Wilayah & Waktu</span>
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

      {/* 1 KOLOM KE BAWAH SEMUA INPUT BERBENTUK DROPDOWN */}
      <div className="flex flex-col gap-3">
        {/* Dropdown 1: Pulau */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
            <Globe className="h-3.5 w-3.5 text-emerald-600" /> Wilayah Pulau
          </label>
          <select
            value={localIsland}
            onChange={(e) => {
              setLocalIsland(e.target.value);
              setLocalProvince('ALL');
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
          >
            {ISLANDS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 2: Provinsi */}
        <div>
          <label className="mb-1 block text-[10px] font-bold text-slate-700">
            Provinsi
          </label>
          <select
            value={localProvince}
            onChange={(e) => setLocalProvince(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
          >
            <option value="ALL">Semua Provinsi ({availableProvinces.length})</option>
            {availableProvinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown 3: Sensor Satelit */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
            <Layers className="h-3.5 w-3.5 text-blue-600" /> Sensor Satelit
          </label>
          <select
            value={localSensor}
            onChange={(e) => setLocalSensor(e.target.value as HotspotSensorType)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
          >
            <option value="VIIRS_SNPP_NRT">VIIRS S-NPP NRT (375m)</option>
            <option value="MODIS_NRT">MODIS Terra & Aqua NRT (1km)</option>
          </select>
        </div>

        {/* Dropdown 4: Mode Tampilan Hotspot (bukan tombol tab lagi) */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
            <Flame className="h-3.5 w-3.5 text-orange-600" /> Mode Visualisasi Hotspot
          </label>
          <select
            value={localMode}
            onChange={(e) => setLocalMode(e.target.value as 'markers' | 'heatmap')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
          >
            <option value="markers">📍 Mode Titik & Kluster (Markers)</option>
            <option value="heatmap">🔥 Mode Kepadatan Panas (Heatmap)</option>
          </select>
        </div>

        {/* Dropdown 5: Tipe Filter Kalender (bukan tombol tab lagi) */}
        <div>
          <label className="mb-1 flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-emerald-600" /> Tipe Filter Waktu
          </label>
          <select
            value={localFilterMode}
            onChange={(e) => setLocalFilterMode(e.target.value as 'single' | 'range')}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none transition-colors"
          >
            <option value="single">📅 Tanggal Spesifik (1 Hari)</option>
            <option value="range">🗓️ Rentang Tanggal (Mulai - Selesai)</option>
          </select>
        </div>

        {/* Tanggal Input */}
        {localFilterMode === 'single' ? (
          <div>
            <label className="mb-1 block text-[10px] font-medium text-slate-600">Pilih Tanggal</label>
            <input
              type="date"
              min="2019-01-01"
              max={new Date().toISOString().split('T')[0]}
              value={localSingleDate}
              onChange={(e) => setLocalSingleDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
            />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-600">Tanggal Mulai</label>
              <input
                type="date"
                min="2019-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={localStartDate}
                onChange={(e) => setLocalStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium text-slate-600">Tanggal Selesai</label>
              <input
                type="date"
                min="2019-01-01"
                max={new Date().toISOString().split('T')[0]}
                value={localEndDate}
                onChange={(e) => setLocalEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* TOMBOL CARI DI PALING BAWAH */}
      <div className="pt-2 border-t border-slate-200/80">
        <button
          type="button"
          onClick={handleApplySearch}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer"
        >
          <Search className="h-4 w-4" />
          <span>Terapkan Filter (Search)</span>
        </button>
      </div>
    </div>
  );
};

export default CalendarFilterPopover;
