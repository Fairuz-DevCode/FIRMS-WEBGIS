import React, { useEffect, useState } from 'react';
import { X, Flame, AlertTriangle, TrendingUp, MapPin, BarChart3, ShieldAlert } from 'lucide-react';

interface AnalyticsData {
  status: string;
  date: string;
  kpi: {
    total_hotspots: number;
    peatland_hotspots: number;
    peatland_pct: number;
    high_confidence: number;
    avg_frp: number;
    max_frp: number;
    avg_brightness: number;
  };
  top_provinces: Array<{
    province: string;
    total: number;
    avg_frp: string | number;
    peatland: number;
    high_conf: number;
  }>;
  risk_distribution: Array<{
    level: string;
    count: number;
    color: string;
  }>;
  trend_5_days: Array<{
    date: string;
    total: number;
    peatland: number;
    avg_frp: string | number;
  }>;
}

interface SpatialAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate?: string;
}

export const SpatialAnalyticsModal: React.FC<SpatialAnalyticsModalProps> = ({
  isOpen,
  onClose,
  currentDate,
}) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const queryParam = currentDate ? `?date=${currentDate}` : '';
        const res = await fetch(`http://localhost:5000/api/analytics/summary${queryParam}`);
        if (!res.ok) throw new Error('Gagal mengambil data analitik spasial');
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message || 'Terjadi kesalahan sistem');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [isOpen, currentDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Dashboard Analisis Spasial Karhutla</h2>
              <p className="text-xs text-slate-300">
                Multi-Criteria Fire Risk & Korelasi Spasial Ekosistem Gambut ({data?.date || currentDate || 'Terbaru'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-orange-600 mb-3" />
              <p className="text-sm font-medium">Memproses data spasial & menghitung risiko...</p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && data && (
            <>
              {/* Row 1: KPI Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Hotspot */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Total Titik Api</span>
                    <Flame className="h-4 w-4 text-orange-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {data.kpi.total_hotspots.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    <span className="font-semibold text-rose-600">{data.kpi.high_confidence}</span> confidence tinggi
                  </div>
                </div>

                {/* Hotspot Gambut */}
                <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50">
                  <div className="flex items-center justify-between text-emerald-700 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Lahan Gambut</span>
                    <AlertTriangle className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-900">
                    {data.kpi.peatland_pct}%
                  </div>
                  <div className="text-xs text-emerald-700 mt-1">
                    <span className="font-bold">{data.kpi.peatland_hotspots}</span> titik di zona gambut
                  </div>
                </div>

                {/* Rata-rata FRP */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Rata-rata FRP</span>
                    <TrendingUp className="h-4 w-4 text-sky-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {data.kpi.avg_frp} <span className="text-sm font-normal text-slate-500">MW</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Maks: <span className="font-semibold text-slate-700">{data.kpi.max_frp} MW</span>
                  </div>
                </div>

                {/* Rata-rata Suhu Kecerahan */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center justify-between text-slate-500 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider">Suhu Kecerahan</span>
                    <Flame className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800">
                    {data.kpi.avg_brightness} <span className="text-sm font-normal text-slate-500">K</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Sensor VIIRS S-NPP
                  </div>
                </div>
              </div>

              {/* Row 2: Multi-Criteria Risk Classification & Top 5 Provinces */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. Multi-Criteria Fire Risk Distribution */}
                <div className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-rose-600" />
                      <h3 className="font-bold text-slate-800 text-sm">Klasifikasi Risiko Karhutla Terpadu</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">Model Multi-Criteria</span>
                  </div>

                  <div className="space-y-3">
                    {data.risk_distribution.map((item) => {
                      const pct = data.kpi.total_hotspots > 0 
                        ? Math.round((item.count / data.kpi.total_hotspots) * 100) 
                        : 0;
                      return (
                        <div key={item.level} className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-700">{item.level}</span>
                            <span className="text-slate-500">{item.count.toLocaleString()} titik ({pct}%)</span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: item.color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                    *Tingkat risiko dihitung melalui pembobotan spasial: Titik api pada <strong>Lahan Gambut</strong> + <strong>FRP &ge; 5-10 MW</strong> + <strong>Confidence Tinggi</strong>.
                  </p>
                </div>

                {/* 2. Top 5 Terparah Provinsi */}
                <div className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-emerald-600" />
                      <h3 className="font-bold text-slate-800 text-sm">5 Provinsi dengan Hotspot Terbanyak</h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">PostGIS Boundary Join</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                          <th className="pb-2">Provinsi</th>
                          <th className="pb-2 text-right">Total Titik</th>
                          <th className="pb-2 text-right">Gambut</th>
                          <th className="pb-2 text-right">Rata2 FRP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.top_provinces.map((prov, idx) => (
                          <tr key={prov.province} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-2.5 font-medium text-slate-800 flex items-center gap-2">
                              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {idx + 1}
                              </span>
                              {prov.province}
                            </td>
                            <td className="py-2.5 text-right font-bold text-slate-900">{prov.total}</td>
                            <td className="py-2.5 text-right font-medium text-emerald-700">
                              {prov.peatland > 0 ? prov.peatland : '-'}
                            </td>
                            <td className="py-2.5 text-right text-slate-600">{prov.avg_frp} MW</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

              {/* Row 3: 5-Day Historical Trend Table / Bar */}
              <div className="rounded-xl border border-slate-200 p-5 bg-white shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    <h3 className="font-bold text-slate-800 text-sm">Tren Spasial 5 Hari Terakhir</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Data Satelit Terverifikasi</span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center">
                  {data.trend_5_days.map((item) => (
                    <div key={item.date} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60">
                      <div className="text-[11px] font-semibold text-slate-500 mb-1">{item.date}</div>
                      <div className="text-base font-black text-slate-800">{item.total.toLocaleString()}</div>
                      <div className="text-[10px] text-emerald-700 font-medium mt-0.5">
                        {item.peatland} gambut
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        FRP ~{item.avg_frp} MW
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-between items-center text-xs text-slate-500">
          <span>*Analisis diperbarui otomatis mengikuti sinkronisasi data NASA FIRMS & PostGIS.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};

export default SpatialAnalyticsModal;
