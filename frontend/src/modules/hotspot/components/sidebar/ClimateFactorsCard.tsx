// ==============================================================================
// KARTU ANALISIS FAKTOR IKLIM & FISIK (CLIMATE FACTORS CARD)
// ==============================================================================
// Menampilkan metrik curah hujan, kelembapan tanah, suhu udara, dan daya radiasi api (FRP).
// ==============================================================================

import React from 'react';
import { CloudRain, Droplets, Thermometer, Zap } from 'lucide-react';

interface ClimateFactorsCardProps {
  rainVal: number;
  moistureVal: number;
  tempVal: number;
  frp: number;
  brightness: number | null;
  isPeat: boolean;
}

export const ClimateFactorsCard: React.FC<ClimateFactorsCardProps> = ({
  rainVal,
  moistureVal,
  tempVal,
  frp,
  brightness,
  isPeat,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <CloudRain className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Analisis Faktor Iklim &amp; Kondisi Fisik
        </span>
        <span className="text-[10px] font-semibold text-slate-500">
          ERA5 / Open-Meteo
        </span>
      </div>

      <div className="space-y-2 text-[11px]">
        {/* Curah Hujan */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
              <CloudRain className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
              Curah Hujan:
            </span>
            <strong className="font-bold text-slate-900 text-xs">
              {rainVal} mm {rainVal < 1 ? '(Tanpa Hujan)' : ''}
            </strong>
          </div>
          <p className="text-[10px] text-slate-600 leading-tight">
            {rainVal < 1 
              ? 'Kondisi Kering (Pemicu Utama): Ketiadaan hujan membuat biomassa permukaan sangat mudah tersulut dan api leluasa menjalar tanpa redaman alami.' 
              : (rainVal < 5 
                ? 'Hujan Sangat Ringan: Belum mencukupi untuk membasahi bahan bakar kering di lapangan.' 
                : 'Presipitasi Aktif: Hujan dapat membantu meredam intensitas api permukaan.')}
          </p>
        </div>

        {/* Kelembaban Tanah */}
        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
              <Droplets className="h-3.5 w-3.5 text-cyan-600" aria-hidden="true" />
              Kelembaban Tanah:
            </span>
            <strong className="font-bold text-slate-900 text-xs">
              {moistureVal} m³/m³ {moistureVal < 0.2 ? '(Kritis / Kering)' : (moistureVal >= 0.35 ? '(Lembab / Basah)' : '(Cukup Basah)')}
            </strong>
          </div>
          <p className="text-[10px] text-slate-600 leading-tight">
            {isPeat && moistureVal < 0.25
              ? 'Bahaya Kritis: Tanah gambut kering berisiko tinggi merambatkan api ke lapisan dalam (smoldering) yang sulit dipadamkan.'
              : (moistureVal >= 0.35 
                ? 'Penahan Rambatan Bawah: Tanah lembab menahan api agar tidak menembus lapisan bawah tanah, sehingga kebakaran terkonsentrasi di permukaan.' 
                : 'Kondisi Sedang: Menopang rambatan api permukaan jika biomassa rumput di atasnya mengering.')}
          </p>
        </div>

        {/* Suhu Udara & Radiasi Api FRP */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" />
              Suhu Udara:
            </span>
            <strong className="mt-1 block font-bold text-slate-900 text-xs">
              {tempVal} °C
            </strong>
            <span className="text-[9.5px] text-slate-500 block mt-0.5">
              {tempVal >= 32 ? 'Panas Ekstrem (Kering Cepat)' : (tempVal >= 26 ? 'Hangat (Kondusif Terbakar)' : 'Sejuk')}
            </span>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 text-[10px] font-semibold flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              Radiasi Api (FRP):
            </span>
            <strong className="mt-1 block font-bold text-slate-900 text-xs">
              {frp.toFixed(1)} MW {brightness ? `(${Math.round(brightness - 273.15)}°C)` : ''}
            </strong>
            <span className="text-[9.5px] text-slate-500 block mt-0.5">
              {frp >= 20 ? 'Intensitas Ekstrem' : (frp >= 5 ? 'Pembakaran Aktif' : 'Intensitas Rendah')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
