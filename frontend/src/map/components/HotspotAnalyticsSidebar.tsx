import React from 'react';
import { 
  X, 
  Flame, 
  AlertTriangle, 
  ShieldAlert, 
  CloudRain, 
  Droplets, 
  Thermometer, 
  Compass, 
  UserCheck, 
  Trees, 
  Layers 
} from 'lucide-react';
import { HotspotMatrixRow, HOTSPOT_COL } from '../../types/hotspot';

export interface SelectedHotspotAnalytics {
  row: HotspotMatrixRow;
  sensor: string;
  isPeatland: boolean;
  province?: string;
  landCoverClass?: string;
  cluster?: {
    nearby_count: number;
    nearest_neighbor_km: number;
    radius_km: number;
  };
  rainfall?: { value: number; category: string };
  soilMoisture?: { value: number; category: string };
  temperature?: { value: number; category: string };
  loading?: boolean;
}

interface HotspotAnalyticsSidebarProps {
  data: SelectedHotspotAnalytics | null;
  onClose: () => void;
}

export const HotspotAnalyticsSidebar: React.FC<HotspotAnalyticsSidebarProps> = ({
  data,
  onClose,
}) => {
  if (!data) return null;

  const lat = data.row[HOTSPOT_COL.LAT];
  const lng = data.row[HOTSPOT_COL.LNG];
  const brightness = data.row[HOTSPOT_COL.BRIGHTNESS];
  const frp = data.row[HOTSPOT_COL.FRP] || 0;
  const conf = String(data.row[HOTSPOT_COL.CONFIDENCE] || '').toLowerCase();
  const acq_date = data.row[HOTSPOT_COL.ACQ_DATE];
  const acq_time = data.row[HOTSPOT_COL.ACQ_TIME];

  // 1. EVALUASI TINGKAT RISIKO MULTIKRITERIA (0 - 100)
  const isHighConf = conf === 'high' || conf === 'h' || Number(conf) >= 80;
  let peatScore = data.isPeatland ? 35 : 10;
  let moistureVal = data.soilMoisture?.value ?? 0.25;
  let soilScore = moistureVal < 0.2 ? 25 : (moistureVal <= 0.35 ? 15 : 5);
  let rainVal = data.rainfall?.value ?? 5;
  let rainScore = rainVal < 1 ? 20 : (rainVal < 5 ? 12 : 3);
  let fireIntensityScore = isHighConf || frp >= 10 ? 20 : (frp >= 5 ? 12 : 5);

  const totalRiskScore = Math.min(peatScore + soilScore + rainScore + fireIntensityScore, 100);

  let riskCategory = 'Rendah';
  let riskColor = '#10b981';
  let riskBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';

  if (totalRiskScore >= 75) {
    riskCategory = 'Sangat Kritis';
    riskColor = '#dc2626';
    riskBg = 'bg-red-100 text-red-900 border-red-300';
  } else if (totalRiskScore >= 50) {
    riskCategory = 'Tinggi';
    riskColor = '#ea580c';
    riskBg = 'bg-orange-50 text-orange-800 border-orange-200';
  } else if (totalRiskScore >= 30) {
    riskCategory = 'Sedang';
    riskColor = '#d97706';
    riskBg = 'bg-amber-50 text-amber-800 border-amber-200';
  }

  // 2. ANALISIS PENYEBAB: ALAMI VS ULAH MANUSIA
  let humanPct = 85;
  let naturalPct = 15;
  const reasons: string[] = [];

  const landCover = (data.landCoverClass || '').toLowerCase();
  const nearbyPoints = data.cluster?.nearby_count ?? 0;

  // Analisis Land Cover
  if (
    landCover.includes('semak') ||
    landCover.includes('rumput') ||
    landCover.includes('kebun') ||
    landCover.includes('crop') ||
    landCover.includes('terbuka')
  ) {
    humanPct += 8;
    reasons.push(
      `Berada di ${data.landCoverClass || 'semak belukar/lahan terbuka'}, karakteristik umum pembukaan lahan (land clearing).`
    );
  } else if (landCover.includes('hutan')) {
    reasons.push(
      `Terdeteksi di kawasan vegetasi hutan, berpotensi perambahan batas konsesi atau kebakaran menjalar dari lahan sekitarnya.`
    );
  }

  // Analisis Spasial Kluster (Clustering)
  if (nearbyPoints >= 10) {
    humanPct += 5;
    reasons.push(
      `Pola spasial mengelompok padat (${nearbyPoints} titik dalam radius 15 km), mengindikasikan pola pembakaran simultan.`
    );
  } else if (nearbyPoints > 0) {
    reasons.push(
      `Terdapat ${nearbyPoints} titik api lain di sekitarnya (jarak terdekat ~${data.cluster?.nearest_neighbor_km} km).`
    );
  } else {
    humanPct -= 15;
    reasons.push(
      `Titik api terisolasi (tidak ada titik api lain dalam 15 km), kemungkinan pembakaran skala kecil lokal.`
    );
  }

  // Analisis Suhu Udara
  const tempVal = data.temperature?.value ?? 28;
  if (tempVal < 33) {
    reasons.push(
      `Suhu udara lokal ${tempVal}°C tergolong normal untuk tropis, tidak cukup ekstrem untuk memicu penyulutan alami spontan.`
    );
  } else {
    humanPct -= 10;
    reasons.push(
      `Suhu udara sangat panas (${tempVal}°C) yang mempercepat penguapan serasah kering.`
    );
  }

  // Normalisasi persentase
  humanPct = Math.min(Math.max(humanPct, 60), 98);
  naturalPct = 100 - humanPct;

  // SVG Donut calculation
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const humanStrokeDash = (humanPct / 100) * circumference;

  return (
    <aside className="absolute top-0 right-0 z-[1200] h-full w-[410px] max-w-[94vw] flex flex-col bg-white shadow-[-8px_0_28px_rgba(0,0,0,0.18)] border-l border-slate-200 animate-in slide-in-from-right duration-200">
      
      {/* Header Sidebar */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-5 py-4 text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <Flame className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">Analisis Data Spasial Titik Api</h2>
            <p className="text-[11px] text-slate-300">
              {data.province || 'Indonesia'} • {acq_date} {acq_time} UTC
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          title="Tutup Analisis"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-slate-700">
        
        {/* Loading overlay if fetching */}
        {data.loading && (
          <div className="flex items-center gap-2 rounded-xl bg-orange-50 p-2.5 text-orange-700 border border-orange-200 text-xs">
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
            <span>Memperbarui perhitungan spasial & kluster...</span>
          </div>
        )}

        {/* 1. ANALISIS KEMUNGKINAN: ULAM MANUSIA VS ALAMI (PIE / DONUT CHART) */}
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/80 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-orange-600" />
              Probabilitas Pemicu Kebakaran
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Model Forensik Spasial</span>
          </div>

          {/* Donut Chart Visual */}
          <div className="flex items-center gap-4 bg-white p-3 rounded-lg border border-slate-200/80">
            <div className="relative flex items-center justify-center shrink-0">
              <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
                {/* Background circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="#38bdf8"
                  strokeWidth="11"
                  strokeDasharray={circumference}
                  strokeDashoffset="0"
                />
                {/* Human stroke slice */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  fill="transparent"
                  stroke="#ea580c"
                  strokeWidth="11"
                  strokeDasharray={`${humanStrokeDash} ${circumference}`}
                  strokeDashoffset="0"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black text-slate-900 leading-none">{humanPct}%</span>
                <span className="text-[8px] font-bold text-slate-400 uppercase">Manusia</span>
              </div>
            </div>

            {/* Legend Pie Chart */}
            <div className="space-y-1.5 text-[11px] flex-1">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-orange-600 inline-block" />
                  Ulah Manusia:
                </span>
                <strong className="text-orange-700 font-bold">{humanPct}%</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400 inline-block" />
                  Faktor Alami:
                </span>
                <strong className="text-sky-700 font-bold">{naturalPct}%</strong>
              </div>
              <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                *Dominasi aktivitas pembersihan lahan (land clearing).
              </div>
            </div>
          </div>

          {/* Argumentasi / Alasan Ilmiah */}
          <div className="mt-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase text-slate-500">Dasar Analisis:</div>
            <ul className="space-y-1 text-[11px] text-slate-600 pl-3">
              {reasons.map((r, i) => (
                <li key={i} className="list-disc leading-relaxed">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 2. SKOR INDEKS KERENTANAN KARHUTLA TERPADU (0-100) */}
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-600" />
              Skor Risiko Multikriteria
            </span>
            <span className={`px-2 py-0.5 rounded-md border font-bold text-[11px] ${riskBg}`}>
              {riskCategory} ({totalRiskScore}/100)
            </span>
          </div>

          {/* Progress bar visual */}
          <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${totalRiskScore}%`, backgroundColor: riskColor }}
            />
          </div>

          <div className="grid grid-cols-4 gap-1 text-[10px] text-slate-500 pt-1 text-center">
            <div className="bg-slate-50 p-1 rounded">
              <div className="font-bold text-slate-700">{peatScore} pts</div>
              <div>Gambut</div>
            </div>
            <div className="bg-slate-50 p-1 rounded">
              <div className="font-bold text-slate-700">{soilScore} pts</div>
              <div>Tanah Kering</div>
            </div>
            <div className="bg-slate-50 p-1 rounded">
              <div className="font-bold text-slate-700">{rainScore} pts</div>
              <div>Defisit Hujan</div>
            </div>
            <div className="bg-slate-50 p-1 rounded">
              <div className="font-bold text-slate-700">{fireIntensityScore} pts</div>
              <div>Daya Api</div>
            </div>
          </div>
        </div>

        {/* 3. ANALISIS KEDEKATAN SPASIAL & KLUSTER (PROXIMITY) */}
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-2">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-blue-600" />
            Analisis Kluster & Kedekatan Spasial
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Kepadatan Titik Sekitar (15 km):</span>
            <strong className="text-slate-900">{nearbyPoints} titik aktif</strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Jarak ke Titik Api Terdekat:</span>
            <strong className="text-slate-900">
              {data.cluster?.nearest_neighbor_km ? `${data.cluster.nearest_neighbor_km} km` : 'Terisolasi (> 15 km)'}
            </strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Status Pola Spasial:</span>
            <strong className={nearbyPoints >= 10 ? 'text-rose-700' : 'text-slate-700'}>
              {nearbyPoints >= 10 ? 'Kluster Padat (Multi-Point Fire)' : nearbyPoints > 0 ? 'Kluster Moderat' : 'Titik Tunggal Tersebar'}
            </strong>
          </div>
        </div>

        {/* 4. PARAMETER LINGKUNGAN & SATELIT TERUKUR */}
        <div className="rounded-xl border border-slate-200 p-4 bg-white shadow-sm space-y-2.5">
          <div className="font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
            <Trees className="h-3.5 w-3.5 text-emerald-600" />
            Parameter Lingkungan & Sensor Terukur
          </div>

          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Status Lahan Gambut:</span>
            <strong className={data.isPeatland ? 'text-amber-800' : 'text-slate-700'}>
              {data.isPeatland ? 'Di Dalam Lahan Gambut' : 'Tanah Mineral'}
            </strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Tutupan Lahan (Sentinel-2):</span>
            <strong className="text-slate-900 text-right">{data.landCoverClass || 'Memuat...'}</strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Kelembaban Tanah (ERA5):</span>
            <strong className="text-slate-900">
              {data.soilMoisture ? `${data.soilMoisture.value} m³/m³` : '-'}
            </strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Curah Hujan (ERA5):</span>
            <strong className="text-slate-900">
              {data.rainfall ? `${data.rainfall.value} mm` : '-'}
            </strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Suhu Udara (ERA5):</span>
            <strong className="text-slate-900">
              {data.temperature ? `${data.temperature.value} °C` : '-'}
            </strong>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-slate-500">Kekuatan Api (FRP) & Kecerahan:</span>
            <strong className="text-slate-900">{frp ? `${frp.toFixed(1)} MW` : 'N/A'} • {brightness ? `${brightness.toFixed(1)} K` : 'N/A'}</strong>
          </div>
        </div>

      </div>

      {/* Footer Sidebar */}
      <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 flex justify-between items-center text-[11px] text-slate-500 shrink-0">
        <span>*PostGIS Spatial Analysis & ERA5</span>
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-md border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-100"
        >
          Tutup
        </button>
      </div>

    </aside>
  );
};

export default HotspotAnalyticsSidebar;
