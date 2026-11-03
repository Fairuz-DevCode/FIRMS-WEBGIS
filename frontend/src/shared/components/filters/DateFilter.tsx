import React from 'react';
import { Calendar, ChevronDown, Flame } from 'lucide-react';

interface DateFilterProps {
  dateFilterMode: 'range' | 'single' | 'days';
  onDateFilterModeChange: (mode: 'range' | 'single' | 'days') => void;
  singleDate: string;
  onSingleDateChange: (date: string) => void;
  hotspotMode: 'markers' | 'heatmap';
  onHotspotModeChange: (mode: 'markers' | 'heatmap') => void;
  isOpen?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

export const DateFilter: React.FC<DateFilterProps> = ({
  dateFilterMode,
  onDateFilterModeChange,
  singleDate,
  onSingleDateChange,
  hotspotMode,
  onHotspotModeChange,
  isOpen = false,
  onToggle,
  isMobile = false,
}) => {
  const setQuickDate = (daysAgo: number) => {
    const targetDate = new Date(Date.now() - daysAgo * 86400000).toISOString().split('T')[0];
    onDateFilterModeChange('single');
    onSingleDateChange(targetDate);
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Tampilan Mode Hotspot */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <Flame className="h-4 w-4 text-emerald-700" />
            <span>Mode Visualisasi Titik Api</span>
          </div>
          <div className="relative">
            <select
              value={hotspotMode}
              onChange={(e) => onHotspotModeChange(e.target.value as 'markers' | 'heatmap')}
              className="w-full h-9 rounded-lg border border-slate-300 bg-white px-3 pr-8 text-xs font-semibold text-slate-800 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 appearance-none cursor-pointer"
            >
              <option value="markers">📍 Titik Pin (Marker & Cluster)</option>
              <option value="heatmap">🔥 Heatmap (Peta Kepadatan Panas)</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tanggal Satelit */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
          <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
            <Calendar className="h-4 w-4 text-emerald-700" />
            <span>Tanggal Deteksi Satelit</span>
          </div>
          <input
            type="date"
            value={singleDate}
            onClick={(e) => {
              try {
                e.currentTarget.showPicker();
              } catch (err) {}
            }}
            onChange={(e) => {
              onDateFilterModeChange('single');
              onSingleDateChange(e.target.value);
            }}
            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 shadow-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          />
          {/* Shortcut Tanggal Cepat */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              type="button"
              onClick={() => setQuickDate(0)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all text-center"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(1)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all text-center"
            >
              Kemarin
            </button>
            <button
              type="button"
              onClick={() => setQuickDate(7)}
              className="flex-1 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-700 active:scale-95 transition-all text-center"
            >
              7 Hari Lalu
            </button>
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
        <Calendar className={`h-3.5 w-3.5 ${isOpen ? 'text-emerald-700' : 'text-emerald-300'}`} />
        <span>{dateFilterMode === 'single' ? singleDate : 'Tanggal'}</span>
        <ChevronDown className="h-3 w-3 opacity-75" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-xl z-[1500] animate-in fade-in zoom-in-95 duration-100 space-y-3">
          <div className="font-bold text-slate-900 pb-1.5 border-b border-slate-100">
            Filter Tanggal Satelit
          </div>

          {/* Mode Visualisasi Hotspot */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Tampilan Hotspot:</label>
            <div className="relative">
              <select
                value={hotspotMode}
                onChange={(e) => onHotspotModeChange(e.target.value as 'markers' | 'heatmap')}
                className="w-full h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 pr-7 text-xs font-semibold text-slate-800 shadow-2xs focus:border-emerald-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="markers">📍 Titik Pin (Marker & Cluster)</option>
                <option value="heatmap">🔥 Heatmap (Kepadatan Titik Panas)</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Mode Tanggal */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Pilih Tanggal Satelit:</label>
            <input
              type="date"
              value={singleDate}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              onChange={(e) => {
                onDateFilterModeChange('single');
                onSingleDateChange(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            />
            {/* Shortcut Tanggal Cepat */}
            <div className="flex items-center gap-1.5 mt-2">
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                className="flex-1 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-600 transition-colors"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                className="flex-1 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-600 transition-colors"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                className="flex-1 py-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-[10px] font-semibold text-slate-600 transition-colors"
              >
                7 Hari Lalu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateFilter;
