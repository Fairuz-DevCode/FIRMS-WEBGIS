import React, { useState } from 'react';
import { Radio, ChevronDown, ChevronUp } from 'lucide-react';
import { HOTSPOT_COL, HotspotMatrixRow, SensorType } from '../types/hotspot.types';

interface SatelliteStatsProps {
  hotspots?: HotspotMatrixRow[] | any[];
  currentSensor?: SensorType | string;
}

interface Counter {
  low: number;
  med: number;
  high: number;
  total: number;
}

/**
 * Mendeteksi satelit (S-NPP vs NOAA-20) berdasarkan acquisition time overpass orbit NASA.
 * NOAA-20: overpass siang ~04:30 - 05:45 UTC, malam ~17:15 - 18:30 UTC
 * S-NPP  : overpass siang ~05:46 - 07:15 UTC, malam ~15:45 - 17:14 UTC
 */
export function getHotspotSatellite(item: HotspotMatrixRow | any): 'SNPP' | 'NOAA20' {
  let timeStr = '';
  if (Array.isArray(item)) {
    timeStr = String(item[HOTSPOT_COL.ACQ_TIME] || '');
  } else if (item?.properties?.acq_time) {
    timeStr = String(item.properties.acq_time);
  } else if (item?.acq_time) {
    timeStr = String(item.acq_time);
  }

  const timeNum = parseInt(timeStr, 10);
  if (!isNaN(timeNum)) {
    if ((timeNum >= 430 && timeNum <= 545) || (timeNum >= 1715 && timeNum <= 1830)) {
      return 'NOAA20';
    }
  }
  return 'SNPP';
}

const StatRow: React.FC<{ title: string; data: Counter; withTitles?: boolean }> = ({
  title,
  data,
  withTitles,
}) => (
  <div className="flex flex-col gap-0.5">
    <div className="text-[0.72rem] font-bold tracking-wide text-slate-600">{title}</div>
    <div className="flex items-center gap-2.5 font-mono text-[0.82rem] font-bold">
      <span className="text-green-600" title={withTitles ? 'Tingkat Kepercayaan Rendah (Green)' : undefined}>
        ● {data.low}
      </span>
      <span className="text-yellow-600" title={withTitles ? 'Tingkat Kepercayaan Sedang (Yellow)' : undefined}>
        ● {data.med}
      </span>
      <span className="text-red-600" title={withTitles ? 'Tingkat Kepercayaan Tinggi (Red)' : undefined}>
        ● {data.high}
      </span>
      <span
        className="ml-auto text-[0.88rem] font-extrabold text-slate-900"
        title={withTitles ? 'Total Hotspot' : undefined}
      >
        {data.total}
      </span>
    </div>
  </div>
);

export const SatelliteStatsWidget: React.FC<SatelliteStatsProps> = ({
  hotspots = [],
  currentSensor = 'ALL',
}) => {
  const [isExpandedMobile, setIsExpandedMobile] = useState<boolean>(false);

  const { snpp, noaa20 } = React.useMemo(() => {
    const s: Counter = { low: 0, med: 0, high: 0, total: 0 };
    const n20: Counter = { low: 0, med: 0, high: 0, total: 0 };

    const len = hotspots.length;
    for (let i = 0; i < len; i++) {
      const item = hotspots[i];
      let conf = '';
      let bright = 325;

      if (Array.isArray(item)) {
        conf = String(item[HOTSPOT_COL.CONFIDENCE] || '').toLowerCase();
        bright = Number(item[HOTSPOT_COL.BRIGHTNESS]) || 325;
      } else if (item?.properties) {
        conf = String(item.properties.confidence || '').toLowerCase();
        bright = Number(item.properties.brightness) || 325;
      } else if (item?.confidence) {
        conf = String(item.confidence || '').toLowerCase();
        bright = Number(item.brightness) || 325;
      }

      let category: 'high' | 'med' | 'low' = 'low';
      if (bright >= 355 || conf === 'h' || conf === 'high' || Number(conf) >= 80) {
        category = 'high';
      } else if (bright >= 325 || conf === 'n' || conf === 'nominal' || Number(conf) >= 30) {
        category = 'med';
      }

      let sat: 'SNPP' | 'NOAA20' = 'SNPP';
      if (currentSensor === 'VIIRS_NOAA20_NRT') {
        sat = 'NOAA20';
      } else if (currentSensor === 'VIIRS_SNPP_NRT') {
        sat = 'SNPP';
      } else {
        sat = getHotspotSatellite(item);
      }

      if (sat === 'NOAA20') {
        n20[category]++;
        n20.total++;
      } else {
        s[category]++;
        s.total++;
      }
    }

    return { snpp: s, noaa20: n20 };
  }, [hotspots, currentSensor]);

  const showAll = currentSensor === 'ALL';
  const showSnpp = showAll || currentSensor === 'VIIRS_SNPP_NRT';
  const showNoaa20 = showAll || currentSensor === 'VIIRS_NOAA20_NRT';

  const totalLow = (showSnpp ? snpp.low : 0) + (showNoaa20 ? noaa20.low : 0);
  const totalMed = (showSnpp ? snpp.med : 0) + (showNoaa20 ? noaa20.med : 0);
  const totalHigh = (showSnpp ? snpp.high : 0) + (showNoaa20 ? noaa20.high : 0);
  const grandTotal = (showSnpp ? snpp.total : 0) + (showNoaa20 ? noaa20.total : 0);

  return (
    <div className="w-full">
      {/* 1. Mobile Compact Pill Bar (Hanya tampil di layar HP jika sedang collapsed) */}
      {!isExpandedMobile && (
        <button
          type="button"
          onClick={() => setIsExpandedMobile(true)}
          className="flex md:hidden w-full items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white/95 px-3 py-2 shadow-md backdrop-blur-md text-xs select-none active:scale-98 transition-all"
        >
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
            <span>FIRMS</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] font-bold">
            <span className="text-green-600">● {totalLow}</span>
            <span className="text-yellow-600">● {totalMed}</span>
            <span className="text-red-600">● {totalHigh}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-extrabold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded">
              {grandTotal}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </button>
      )}

      {/* 2. Full Expanded Card (Selalu tampil di desktop md:flex, atau di mobile saat di-expand) */}
      <div
        className={`${
          isExpandedMobile ? 'flex' : 'hidden md:flex'
        } flex-col select-none gap-2 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md min-w-[260px] text-xs text-slate-800 transition-all`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-green-600" />
            <span>Data Satelit NASA FIRMS</span>
          </div>
          <button
            type="button"
            onClick={() => setIsExpandedMobile(false)}
            className="md:hidden p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
            title="Kecilkan widget"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>

        {showSnpp && <StatRow title="VIIRS S-NPP (375m)" data={snpp} withTitles={!showNoaa20} />}
        {showNoaa20 && <StatRow title="VIIRS NOAA-20 (375m)" data={noaa20} withTitles={!showSnpp} />}

        {showAll && (
          <div className="mt-1 flex items-center justify-between border-t border-slate-200/90 pt-1.5 text-slate-700">
            <span className="text-[0.72rem] font-bold">Total Hotspot:</span>
            <span className="rounded bg-emerald-100/80 px-2 py-0.5 font-mono text-[0.85rem] font-extrabold text-emerald-900 border border-emerald-200/60">
              {grandTotal} Titik
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SatelliteStatsWidget;
