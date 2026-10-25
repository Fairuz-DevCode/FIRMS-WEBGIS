import React from 'react';
import { Radio } from 'lucide-react';
import { HOTSPOT_COL, HotspotMatrixRow, SensorType } from '../../types/hotspot';

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
  currentSensor = 'VIIRS_SNPP_NRT',
}) => {
  const { snpp, terraAqua, noaa20, noaa21 } = React.useMemo(() => {
    const s: Counter = { low: 0, med: 0, high: 0, total: 0 };
    const ta: Counter = { low: 0, med: 0, high: 0, total: 0 };
    const n20: Counter = { low: 0, med: 0, high: 0, total: 0 };
    const n21: Counter = { low: 0, med: 0, high: 0, total: 0 };

    const len = hotspots.length;
    for (let i = 0; i < len; i++) {
      const item = hotspots[i];
      let conf = '';
      let sensor = currentSensor ? String(currentSensor).toUpperCase() : '';

      if (Array.isArray(item)) {
        conf = String(item[HOTSPOT_COL.CONFIDENCE] || '').toLowerCase();
      } else if (item?.properties) {
        conf = String(item.properties.confidence || '').toLowerCase();
        if (item.properties.sensor) sensor = String(item.properties.sensor).toUpperCase();
      } else if (item?.confidence) {
        conf = String(item.confidence || '').toLowerCase();
        if (item.sensor) sensor = String(item.sensor).toUpperCase();
      }

      let category: 'high' | 'med' | 'low' = 'low';
      if (conf === 'h' || conf === 'high' || Number(conf) >= 80) {
        category = 'high';
      } else if (
        conf === 'n' ||
        conf === 'nominal' ||
        conf === 'm' ||
        conf === 'med' ||
        conf === 'medium' ||
        Number(conf) >= 30
      ) {
        category = 'med';
      }

      if (sensor.includes('MODIS') || sensor.includes('TERRA') || sensor.includes('AQUA')) {
        ta[category]++;
        ta.total++;
      } else if (sensor.includes('NOAA21') || sensor.includes('NOAA-21')) {
        n21[category]++;
        n21.total++;
      } else if (sensor.includes('NOAA20') || sensor.includes('NOAA-20')) {
        n20[category]++;
        n20.total++;
      } else {
        s[category]++;
        s.total++;
      }
    }

    return { snpp: s, terraAqua: ta, noaa20: n20, noaa21: n21 };
  }, [hotspots, currentSensor]);

  return (
    <div className="flex flex-col select-none gap-2 rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-md min-w-[260px] text-xs text-slate-800">
      <div className="flex items-center gap-1.5 border-b border-slate-200 pb-1.5 text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
        <Radio className="h-3.5 w-3.5 text-green-600" />
        <span>Data Satelit NASA FIRMS</span>
      </div>

      <StatRow title="VIIRS S-NPP (375m)" data={snpp} withTitles />
      {terraAqua.total > 0 && <StatRow title="NASA-TERRA/AQUA" data={terraAqua} />}
      {noaa20.total > 0 && <StatRow title="NASA-NOAA20" data={noaa20} />}
      {noaa21.total > 0 && <StatRow title="NASA-NOAA21" data={noaa21} />}

      <div className="flex items-center justify-center gap-1.5 pt-1.5 border-t border-slate-100">
        <span className="flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[0.72rem] font-semibold text-green-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" /> Low
        </span>
        <span className="flex items-center gap-1 rounded border border-yellow-200 bg-yellow-50 px-2 py-0.5 text-[0.72rem] font-semibold text-yellow-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-yellow-500" /> Medium
        </span>
        <span className="flex items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[0.72rem] font-semibold text-red-700">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" /> High
        </span>
      </div>
    </div>
  );
};

export default SatelliteStatsWidget;
