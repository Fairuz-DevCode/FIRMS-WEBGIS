// ==============================================================================
// SIDEBAR ANALISIS SPASIAL TITIK API (HOTSPOT ANALYTICS SIDEBAR)
// ==============================================================================
// Menampilkan panel analisis komprehensif saat titik api diklik pada peta.
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { X, ChevronUp, Sparkles, Flame } from 'lucide-react';
import { SelectedHotspotAnalytics } from '../types/hotspot.types';
import { HOTSPOT_COL } from '../constants/hotspot.constants';
import { 
  generateSynthesisNarrative, 
  getFireTypology, 
  getSpatialPattern 
} from '../utils/hotspotNarrative.utils';

import { ClimateFactorsCard } from './sidebar/ClimateFactorsCard';
import { FireTypologyCard } from './sidebar/FireTypologyCard';
import { SpatialPatternCard } from './sidebar/SpatialPatternCard';

interface HotspotAnalyticsSidebarProps {
  data: SelectedHotspotAnalytics | null;
  onClose: () => void;
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
  const acqDate = String(data.row[HOTSPOT_COL.ACQ_DATE] || '');
  const acqTime = String(data.row[HOTSPOT_COL.ACQ_TIME] || '');
  const isPeat = data.isPeatland;
  const landCover = (data.landCoverClass || '').toLowerCase();
  const nearbyPoints = data.cluster?.nearby_count ?? 0;
  const nearestKm = data.cluster?.nearest_neighbor_km;
  const moistureVal = data.soilMoisture?.value ?? 0;
  const rainVal = data.rainfall?.value ?? 0;
  const tempVal = data.temperature?.value ?? 28;
  const totalAreaPoints = nearbyPoints + 1;

  // 1. Hitung tipologi dan pola spasial melalui helper murni
  const typology = getFireTypology(isPeat, moistureVal, landCover, data.landCoverClass);
  const pattern = getSpatialPattern(totalAreaPoints, nearestKm, landCover, data.landCoverClass);
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
      {/* Backdrop mobile saat panel dinaikkan */}
      {isExpanded && (
        <div 
          className="fixed inset-0 z-[1300] bg-slate-950/40 backdrop-blur-xs lg:hidden animate-in fade-in duration-200"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <aside className={`fixed inset-x-0 bottom-0 z-[1400] w-full flex flex-col rounded-t-2xl border-t border-slate-200 bg-slate-50 shadow-2xl transition-all duration-300 ease-in-out lg:absolute lg:inset-x-auto lg:top-0 lg:right-0 lg:bottom-0 lg:h-full lg:max-h-full lg:w-[385px] xl:w-[420px] lg:rounded-none lg:border-t-0 lg:border-l lg:shadow-[-10px_0_30px_rgba(0,0,0,0.18)] lg:slide-in-from-right lg:z-[1050] ${
        isExpanded ? 'max-h-[88vh] h-[88vh]' : 'max-h-[220px]'
      }`}>
        {/* Tombol ekspansi mobile */}
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
              title={`${data.province || 'Indonesia'} • ${acqDate} ${acqTime} UTC`}
            >
              {data.province || 'Indonesia'} • {acqDate} {acqTime} UTC
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

        {/* Ringkasan Ringkas Mobile (Saat collapsed) */}
        {!isExpanded && (
          <div className="p-3 space-y-2 lg:hidden overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="flex flex-col text-[11px]">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-800 truncate max-w-[190px]">
                  <Flame className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span>{typology.category}</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[190px] font-medium mt-0.5">
                  {isPeat ? 'Ekosistem Gambut' : 'Tanah Mineral'} • {totalAreaPoints} titik aktif di 15km
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

        {/* Isi Analisis Lengkap (Scrollable) */}
        <div className={`${!isExpanded ? 'hidden lg:block' : 'block'} flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3 text-xs text-slate-700 custom-scrollbar`}>
        
          {/* Indikator Status Memuat */}
          {data.loading && (
            <div className="flex items-center gap-2 rounded-xl bg-orange-50 p-2.5 text-orange-700 border border-orange-200 text-xs">
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
              <span>Memuat data overlay spasial &amp; cuaca ERA5...</span>
            </div>
          )}

          {/* 1. Diagnosis & Sintesis Lapangan */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-800">
              <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Diagnosis &amp; Sintesis Lapangan</span>
            </div>
            <p className="text-[11.5px] text-slate-700 leading-relaxed font-medium text-justify">
              {synthesisNarrative}
            </p>
          </div>

          {/* 2. Kartu Analisis 3 Faktor Iklim & Kondisi Fisik */}
          <ClimateFactorsCard 
            rainVal={rainVal}
            moistureVal={moistureVal}
            tempVal={tempVal}
            frp={frp}
            brightness={brightness}
            isPeat={isPeat}
          />

          {/* 3. Kartu Tipologi Kebakaran & Karakteristik Lahan */}
          <FireTypologyCard 
            typology={typology}
            isPeat={isPeat}
            landCoverClass={data.landCoverClass}
          />

          {/* 4. Kartu Pola Spasial & Sebaran Titik Api */}
          <SpatialPatternCard 
            pattern={pattern}
            totalAreaPoints={totalAreaPoints}
            nearestKm={nearestKm}
            lat={Number(lat)}
            lng={Number(lng)}
            acqDate={acqDate}
            acqTime={acqTime}
          />

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
