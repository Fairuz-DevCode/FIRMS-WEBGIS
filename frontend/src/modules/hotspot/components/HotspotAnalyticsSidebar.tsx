import React, { useState, useEffect } from 'react';
import { 
  X, 
  Flame, 
  Trees, 
  Layers,
  ChevronUp,
  Wind,
  AlertOctagon,
  Droplets,
  CloudRain,
  Thermometer,
  Zap,
  MapPin,
  Sparkles
} from 'lucide-react';
import { HOTSPOT_COL, SelectedHotspotAnalytics } from '../types/hotspot.types';

interface HotspotAnalyticsSidebarProps {
  data: SelectedHotspotAnalytics | null;
  onClose: () => void;
}

/**
 * Menghasilkan narasi sintesis dan diagnosis lapangan otomatis
 * berdasarkan interaksi cuaca (hujan, suhu), kondisi tanah (gambut vs mineral, kelembaban),
 * tutupan lahan, dan pola kluster spasial.
 */
function generateSynthesisNarrative({
  isPeat,
  landCover,
  moistureVal,
  rainVal,
  tempVal,
  frp,
  nearbyPoints,
  nearestKm,
}: {
  isPeat: boolean;
  landCover: string;
  moistureVal: number;
  rainVal: number;
  tempVal: number;
  frp: number;
  nearbyPoints: number;
  nearestKm?: number;
}): string {
  // 1. Sintesis Cuaca & Presipitasi
  let weatherText = '';
  if (rainVal < 1) {
    weatherText = `Ketiadaan presipitasi hujan (0 mm) di tengah suhu udara ${tempVal}°C memicu pengeringan serasah dan vegetasi permukaan.`;
  } else if (rainVal < 5) {
    weatherText = `Curah hujan tercatat sangat minim (${rainVal} mm) dengan suhu ${tempVal}°C, belum mencukupi untuk membasahi biomassa kering.`;
  } else {
    weatherText = `Meskipun terdapat curah hujan (${rainVal} mm), anomali termal tetap terdeteksi pada suhu ${tempVal}°C.`;
  }

  // 2. Sintesis Karakteristik Tanah & Lahan
  let soilText = '';
  if (isPeat && moistureVal < 0.25) {
    soilText = `Kondisi sangat kritis karena titik api berada di Lahan Gambut (KHG) dengan kelembaban tanah rendah (< 0.25 m³/m³), berpotensi tinggi memicu kebakaran bawah permukaan (smoldering fire) yang melepaskan kabut asap pekat.`;
  } else if (isPeat) {
    soilText = `Titik api berada di ekosistem gambut, namun kelembaban tanah (${moistureVal} m³/m³) masih menahan laju rambatan ke lapisan gambut dalam.`;
  } else if (moistureVal >= 0.35) {
    soilText = `Kelembaban tanah yang relatif tinggi (${moistureVal} m³/m³) karakteristik kawasan sempadan rawa/sungai menahan api agar tidak menembus tanah, sehingga pembakaran terkonsentrasi pada semak dan kanopi permukaan (surface fire).`;
  } else {
    soilText = `Tanah mineral dengan kelembaban ${moistureVal} m³/m³ di area ${landCover || 'lahan terbuka'} membuat api permukaan leluasa menjalar mengikuti arah angin.`;
  }

  // 3. Sintesis Pola Spasial & Potensi Penjalaran
  let spatialText = '';
  const totalAreaPoints = nearbyPoints + 1;
  if (totalAreaPoints >= 10) {
    spatialText = `Ditemukannya kluster masif (${totalAreaPoints} titik aktif dalam radius 15 km${nearestKm ? `, jarak terdekat ${nearestKm} km` : ''}) mengindikasikan kebakaran luas terkoordinasi yang berpotensi menyatu jika arah angin sejajar.`;
  } else if (totalAreaPoints >= 2) {
    spatialText = `Terdeteksi kluster ${totalAreaPoints} titik api aktif yang saling berdekatan${nearestKm ? ` (jarak antar titik ~${nearestKm} km)` : ''}, sehingga berpotensi saling merambat dan memperluas area kebakaran.`;
  } else {
    spatialText = `Titik api bersifat tunggal terisolasi tanpa indikasi titik api aktif lain dalam radius 15 km.`;
  }

  return `${weatherText} ${soilText} ${spatialText}`;
}

export const HotspotAnalyticsSidebar: React.FC<HotspotAnalyticsSidebarProps> = ({
  data,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setIsExpanded(false);
  }, [data?.row[HOTSPOT_COL.LAT], data?.row[HOTSPOT_COL.LNG]]);

  if (!data) return null;

  const lat = data.row[HOTSPOT_COL.LAT];
  const lng = data.row[HOTSPOT_COL.LNG];
  const brightness = data.row[HOTSPOT_COL.BRIGHTNESS];
  const frp = data.row[HOTSPOT_COL.FRP] || 0;
  const acq_date = data.row[HOTSPOT_COL.ACQ_DATE];
  const acq_time = data.row[HOTSPOT_COL.ACQ_TIME];
  const isPeat = data.isPeatland;
  const landCover = (data.landCoverClass || '').toLowerCase();
  const nearbyPoints = data.cluster?.nearby_count ?? 0;
  const nearestKm = data.cluster?.nearest_neighbor_km;
  const moistureVal = data.soilMoisture?.value ?? 0;
  const rainVal = data.rainfall?.value ?? 0;
  const tempVal = data.temperature?.value ?? 28;

  // 1. TIPOLOGI KEBAKARAN & KARAKTERISTIK LAHAN (OVERLAY KHG & TUTUPAN LAHAN)
  let fireTypeTitle = 'Kebakaran Permukaan Lahan (Surface Fire)';
  let fireTypeDesc = 'Api membakar serasah dan rumput kering di atas permukaan tanah mineral.';
  let fireTypeBadge = 'bg-amber-100 text-amber-900 border-amber-300';
  let fireTypeCategory = 'Permukaan Lahan';
  let fireTypeIcon = <Flame className="h-5 w-5 text-amber-600" aria-hidden="true" />;
  let fireTypeBorder = 'border-amber-200 bg-amber-50/40';
  let smokeHazard = 'Moderat (Abu & Partikel Ringan)';
  let smokeBadge = 'text-amber-800 bg-amber-100 font-semibold';

  if (isPeat && moistureVal < 0.25) {
    fireTypeTitle = 'Kebakaran Gambut Bawah Permukaan (Smoldering Peat Fire)';
    fireTypeDesc = 'Terdeteksi di dalam Kesatuan Hidrologis Gambut (KHG) dengan kelembaban tanah rendah (< 0.25 m³/m³). Api berisiko merambat ke lapisan organik bawah tanah secara lambat tanpa nyala terbuka, menghasilkan emisi kabut asap pekat (PM2.5 & CO) dan membutuhkan penanganan intensif.';
    fireTypeBadge = 'bg-red-100 text-red-900 border-red-300';
    fireTypeCategory = 'Gambut Smoldering';
    fireTypeIcon = <AlertOctagon className="h-5 w-5 text-red-600" aria-hidden="true" />;
    fireTypeBorder = 'border-red-300 bg-red-50/50 shadow-xs';
    smokeHazard = 'Sangat Tinggi (PM2.5 & CO Pekat)';
    smokeBadge = 'text-red-700 bg-red-100 font-bold';
  } else if (isPeat) {
    fireTypeTitle = 'Kebakaran Permukaan di Ekosistem Gambut';
    fireTypeDesc = 'Titik api terkonfirmasi berada di ekosistem gambut, namun kelembaban tanah permukaan masih cukup menahan perambatan ke lapisan dalam.';
    fireTypeBadge = 'bg-orange-100 text-orange-900 border-orange-300';
    fireTypeCategory = 'Gambut Transisi';
    fireTypeIcon = <Layers className="h-5 w-5 text-orange-600" aria-hidden="true" />;
    fireTypeBorder = 'border-orange-200 bg-orange-50/40';
    smokeHazard = 'Tinggi (Potensi Merambat ke Bawah)';
    smokeBadge = 'text-orange-700 bg-orange-100 font-bold';
  } else if (landCover.includes('hutan') || landCover.includes('tree')) {
    fireTypeTitle = 'Kebakaran Kanopi / Tegakan Hutan (Forest Fire)';
    fireTypeDesc = 'Terdeteksi di kawasan tutupan pohon hutan dengan intensitas termal tinggi. Berpotensi menimbulkan kerusakan tegakan kayu alam dan degradasi tutupan hutan.';
    fireTypeBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
    fireTypeCategory = 'Hutan & Kanopi';
    fireTypeIcon = <Trees className="h-5 w-5 text-emerald-600" aria-hidden="true" />;
    fireTypeBorder = 'border-emerald-200 bg-emerald-50/40';
    smokeHazard = 'Tinggi (Emisi Biomassa Pohon)';
    smokeBadge = 'text-emerald-800 bg-emerald-100 font-semibold';
  } else {
    fireTypeTitle = 'Kebakaran Permukaan Lahan Terbuka / Semak';
    fireTypeDesc = `Terdeteksi di area ${data.landCoverClass || 'semak belukar/lahan terbuka'}. Api menjalar pada rumput dan semak kering permukaan dengan kecepatan bergantung arah angin.`;
    fireTypeBadge = 'bg-amber-100 text-amber-900 border-amber-300';
    fireTypeCategory = 'Semak & Lahan Terbuka';
    fireTypeIcon = <Wind className="h-5 w-5 text-amber-600" aria-hidden="true" />;
    fireTypeBorder = 'border-amber-200 bg-amber-50/30';
    smokeHazard = 'Sedang (Jelaga Rumput Kering)';
    smokeBadge = 'text-amber-800 bg-amber-100 font-medium';
  }

  // 2. POLA SPASIAL & SEBARAN TITIK API (POSTGIS SPATIAL CLUSTERING)
  // nearbyPoints adalah jumlah titik api tetangga lain dalam radius 15km. Total titik di area = nearbyPoints + 1 (termasuk titik ini)
  const totalAreaPoints = nearbyPoints + 1;
  let patternTitle = 'Titik Api Tunggal Terisolasi';
  let patternDesc = `Tidak ada titik api lain dalam radius 15 km (${nearestKm && nearestKm < 15 ? `jarak terdekat ~${nearestKm} km` : 'terisolasi'}). Titik api berdiri sendiri tanpa indikasi kluster terdekat.`;
  let patternBadge = 'bg-slate-100 text-slate-700 border-slate-300';
  let patternType = 'Terisolasi';

  if (totalAreaPoints >= 10 && (landCover.includes('semak') || landCover.includes('kebun') || landCover.includes('terbuka') || landCover.includes('crop') || landCover.includes('rumput'))) {
    patternTitle = 'Kluster Masif Pembukaan Lahan (Land Clearing)';
    patternDesc = `Pola spasial mengelompok sangat padat (${totalAreaPoints} titik aktif dalam 15 km) di area ${data.landCoverClass || 'semak belukar/perkebunan'}, mengindikasikan pembakaran simultan terencana untuk pembersihan lahan baru.`;
    patternBadge = 'bg-orange-100 text-orange-950 border-orange-300 font-bold';
    patternType = 'Kluster Masif Lahan Terbuka';
  } else if (totalAreaPoints >= 10 && (landCover.includes('hutan') || landCover.includes('tree'))) {
    patternTitle = 'Kluster Masif di Kawasan Hutan';
    patternDesc = `Terjadi kluster masif (${totalAreaPoints} titik aktif dalam 15 km) yang merambah kawasan tutupan pohon hutan.`;
    patternBadge = 'bg-rose-100 text-rose-950 border-rose-300 font-bold';
    patternType = 'Kluster Masif Hutan';
  } else if (totalAreaPoints >= 2) {
    patternTitle = 'Kluster Titik Api Aktif (Multi-Point Fire)';
    patternDesc = `Terdapat ${totalAreaPoints} titik api aktif yang saling berdekatan dalam radius 15 km${nearestKm ? ` (jarak terdekat ~${nearestKm} km)` : ''}. Api berpotensi saling merambat dan menyatu jika arah angin sejajar.`;
    patternBadge = 'bg-amber-100 text-amber-950 border-amber-300 font-semibold';
    patternType = `Kluster (${totalAreaPoints} Titik)`;
  }

  const synthesisNarrative = generateSynthesisNarrative({
    isPeat,
    landCover,
    moistureVal,
    rainVal,
    tempVal,
    frp,
    nearbyPoints,
    nearestKm,
  });

  return (
    <>
      {/* Mobile & Tablet backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[1300] bg-slate-950/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside className={`fixed inset-x-0 bottom-0 z-[1400] w-full flex flex-col rounded-t-2xl border-t border-slate-200 bg-slate-50 shadow-2xl transition-all duration-300 ease-in-out lg:absolute lg:inset-x-auto lg:top-0 lg:right-0 lg:bottom-0 lg:h-full lg:max-h-full lg:w-[385px] xl:w-[420px] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-[-10px_0_30px_rgba(0,0,0,0.18)] lg:slide-in-from-right lg:z-[1050] ${
        isExpanded ? 'max-h-[88vh] h-[88vh]' : 'max-h-[220px]'
      }`}>
        {/* Mobile handle indicator */}
        <button 
          type="button"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Perkecil panel analisis" : "Buka panel analisis lengkap"}
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex flex-col items-center justify-center pt-2.5 pb-1.5 lg:hidden bg-gradient-to-r from-prims-900 via-prims-800 to-prims-900 rounded-t-2xl cursor-pointer select-none active:brightness-110 transition-all border-b border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
        >
          <span className="w-10 h-1 bg-emerald-400/70 rounded-full mb-1" aria-hidden="true" />
        </button>

        {/* Header Command Center */}
        <div className="flex items-center justify-between border-b border-white/15 bg-gradient-to-r from-prims-900 via-prims-800 to-prims-900 px-4 py-3 sm:px-5 sm:py-3.5 text-white shrink-0 shadow-sm">
          <div className="flex flex-col">
            <h2 className="text-xs sm:text-sm font-bold tracking-wide">Pusat Analisis Spasial Titik Api</h2>
            <p 
              className="text-[10px] sm:text-[11px] text-emerald-100/90 truncate max-w-[240px] sm:max-w-none font-medium"
              title={`${data.province || 'Indonesia'} • ${acq_date} ${acq_time} UTC`}
            >
              {data.province || 'Indonesia'} • {acq_date} {acq_time} UTC
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel analisis"
            className="p-1.5 rounded-lg text-emerald-100/80 hover:text-white hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
            title="Tutup analisis"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Compact Mobile Summary (Saat collapsed) */}
        {!isExpanded && (
          <div className="p-3 space-y-2 lg:hidden overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex flex-col text-[11px]">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-800 truncate max-w-[190px]">
                  {fireTypeIcon}
                  <span>{fireTypeCategory}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[190px] font-medium mt-0.5">
                  {isPeat ? '🌾 Ekosistem Gambut' : 'Tanah Mineral'} • {totalAreaPoints} titik aktif di 15km
                </div>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${isPeat ? 'bg-red-100 text-red-900 border-red-300' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                  {isPeat ? 'Gambut' : 'Mineral'}
                </span>
                <span className="text-[10px] text-slate-600 mt-1 font-semibold">
                  {frp ? `${frp.toFixed(1)} MW` : ''}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-prims-900 to-prims-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span>Buka Profil Kontekstual Lengkap</span>
              <ChevronUp className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Full Scrollable Body */}
        <div className={`${!isExpanded ? 'hidden lg:block' : 'block'} flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 text-xs text-slate-700 custom-scrollbar`}>
        
          {/* Loading state indicator */}
          {data.loading && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 p-2.5 text-orange-700 border border-orange-200 text-xs">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <span>Memuat data overlay spasial & cuaca ERA5...</span>
            </div>
          )}

          {/* 1. DIAGNOSIS & SINTESIS LAPANGAN (SARAN 2) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
              <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Diagnosis &amp; Sintesis Lapangan</span>
            </div>
            <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium text-justify">
              {synthesisNarrative}
            </p>
          </div>

          {/* 2. ANALISIS PERAN 3 FAKTOR IKLIM & KONDISI FISIK (SARAN 3) */}
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

          {/* 3. KARAKTERISTIK LAHAN & POLA SPASIAL (SARAN 4) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5 transition-all">
            <div className="flex items-center justify-between border-b border-black/5 pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                {fireTypeIcon}
                Tipologi Kebakaran
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {isPeat ? 'Kubah Gambut' : 'Tanah Mineral'}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="text-[13px] font-black text-slate-900 leading-tight">
                {fireTypeTitle}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {fireTypeDesc}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 text-[11px]">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-semibold block">Ekosistem Gambut (KHG):</span>
                <strong className={`mt-0.5 block font-bold ${isPeat ? 'text-amber-800' : 'text-slate-800'}`}>
                  {isPeat ? '🌾 Lahan Gambut' : 'Tanah Mineral'}
                </strong>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-slate-500 text-[10px] font-semibold block">Tutupan Lahan (Sentinel-2):</span>
                <strong className="mt-0.5 block font-bold text-slate-800 truncate" title={data.landCoverClass || ''}>
                  {data.landCoverClass || 'Memuat...'}
                </strong>
              </div>
            </div>

            {/* Smoke Hazard Indicator Banner */}
            <div className="flex items-center justify-between pt-1 border-t border-black/5 text-[10.5px]">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Wind className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
                Risiko Asap &amp; Partikel:
              </span>
              <span className="text-[11px] font-semibold text-slate-600">
                {smokeHazard}
              </span>
            </div>
          </div>

          {/* Pola Spasial & Sebaran Titik Api */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Pola Spasial &amp; Sebaran Titik Api
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {patternType}
              </span>
            </div>

            <div className="space-y-1">
              <div className="text-[12.5px] font-extrabold text-slate-900 leading-tight">
                {patternTitle}
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {patternDesc}
              </p>
            </div>

            {/* Spatial Metrics Cards */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                <div className="text-slate-500 text-[10px] font-semibold">Kepadatan Titik (15 km):</div>
                <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                  <span>{totalAreaPoints}</span>
                  <span className="text-[10px] font-semibold text-slate-500">titik aktif</span>
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                <div className="text-slate-500 text-[10px] font-semibold">Jarak Tetangga Terdekat:</div>
                <div className="font-bold text-slate-800 text-sm mt-0.5 flex items-center gap-1">
                  <span>{nearestKm && nearestKm < 15 ? `${nearestKm}` : '> 15'}</span>
                  <span className="text-[10px] font-semibold text-slate-500">km</span>
                </div>
              </div>
            </div>

            {/* Koordinat & Waktu Metadata Ringkas */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
              </span>
              <span>{acq_date} {acq_time} UTC</span>
            </div>
          </div>

        </div>

        {/* Footer Sidebar */}
        <div className="border-t border-slate-200 bg-white px-4 py-2.5 sm:px-5 sm:py-3 flex items-center justify-between shrink-0 shadow-xs">
          <div className="text-[10px] text-slate-500 font-semibold">
            Sistem WebGIS PRIMS Karhutla
          </div>
          <div className="flex items-center gap-2">
            {isExpanded && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="lg:hidden h-8 px-3.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 active:scale-95 transition-all text-xs inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Perkecil
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-lg bg-gradient-to-r from-prims-900 to-prims-800 text-white font-semibold hover:brightness-110 active:scale-95 transition-all text-xs inline-flex items-center justify-center shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              Tutup
            </button>
          </div>
        </div>

      </aside>
    </>
  );
};

export default HotspotAnalyticsSidebar;
