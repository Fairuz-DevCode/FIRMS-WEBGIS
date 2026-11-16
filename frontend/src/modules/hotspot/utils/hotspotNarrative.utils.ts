// ==============================================================================
// UTILS NARASI SINTESIS DAN TIPOLOGI KEBAKARAN (HOTSPOT NARRATIVE UTILS)
// ==============================================================================
// Menghasilkan narasi sintesis lapangan, klasifikasi kebakaran, dan pola spasial.
// ==============================================================================

export interface SynthesisParams {
  isPeat: boolean;
  landCover: string;
  moistureVal: number;
  rainVal: number;
  tempVal: number;
  frp: number;
  nearbyPoints: number;
  nearestKm?: number;
}

export function generateSynthesisNarrative({
  isPeat,
  landCover,
  moistureVal,
  rainVal,
  tempVal,
  nearbyPoints,
  nearestKm,
}: SynthesisParams): string {
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

export interface FireTypologyResult {
  title: string;
  desc: string;
  category: string;
  badge: string;
  border: string;
  smokeHazard: string;
  type: 'smoldering' | 'peat_surface' | 'forest' | 'open_land';
}

export function getFireTypology(
  isPeat: boolean,
  moistureVal: number,
  landCover: string,
  rawLandCoverClass?: string
): FireTypologyResult {
  if (isPeat && moistureVal < 0.25) {
    return {
      title: 'Kebakaran Gambut Bawah Permukaan (Smoldering Peat Fire)',
      desc: 'Terdeteksi di dalam Kesatuan Hidrologis Gambut (KHG) dengan kelembaban tanah rendah (< 0.25 m³/m³). Api berisiko merambat ke lapisan organik bawah tanah secara lambat tanpa nyala terbuka, menghasilkan emisi kabut asap pekat (PM2.5 & CO) dan membutuhkan penanganan intensif.',
      category: 'Gambut Smoldering',
      badge: 'bg-red-100 text-red-900 border-red-300',
      border: 'border-red-300 bg-red-50/50 shadow-xs',
      smokeHazard: 'Sangat Tinggi (PM2.5 & CO Pekat)',
      type: 'smoldering'
    };
  } else if (isPeat) {
    return {
      title: 'Kebakaran Permukaan di Ekosistem Gambut',
      desc: 'Titik api terkonfirmasi berada di ekosistem gambut, namun kelembaban tanah permukaan masih cukup menahan perambatan ke lapisan dalam.',
      category: 'Gambut Transisi',
      badge: 'bg-orange-100 text-orange-900 border-orange-300',
      border: 'border-orange-200 bg-orange-50/40',
      smokeHazard: 'Tinggi (Potensi Merambat ke Bawah)',
      type: 'peat_surface'
    };
  } else if (landCover.includes('hutan') || landCover.includes('tree')) {
    return {
      title: 'Kebakaran Kanopi / Tegakan Hutan (Forest Fire)',
      desc: 'Terdeteksi di kawasan tutupan pohon hutan dengan intensitas termal tinggi. Berpotensi menimbulkan kerusakan tegakan kayu alam dan degradasi tutupan hutan.',
      category: 'Hutan & Kanopi',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      border: 'border-emerald-200 bg-emerald-50/40',
      smokeHazard: 'Tinggi (Emisi Biomassa Pohon)',
      type: 'forest'
    };
  }

  return {
    title: 'Kebakaran Permukaan Lahan Terbuka / Semak',
    desc: `Terdeteksi di area ${rawLandCoverClass || 'semak belukar/lahan terbuka'}. Api menjalar pada rumput dan semak kering permukaan dengan kecepatan bergantung arah angin.`,
    category: 'Semak & Lahan Terbuka',
    badge: 'bg-amber-100 text-amber-900 border-amber-300',
    border: 'border-amber-200 bg-amber-50/30',
    smokeHazard: 'Sedang (Jelaga Rumput Kering)',
    type: 'open_land'
  };
}

export interface SpatialPatternResult {
  title: string;
  desc: string;
  type: string;
  badge: string;
}

export function getSpatialPattern(
  totalAreaPoints: number,
  nearestKm?: number,
  landCover: string = '',
  rawLandCoverClass?: string
): SpatialPatternResult {
  if (totalAreaPoints >= 10 && (landCover.includes('semak') || landCover.includes('kebun') || landCover.includes('terbuka') || landCover.includes('crop') || landCover.includes('rumput'))) {
    return {
      title: 'Kluster Masif Pembukaan Lahan (Land Clearing)',
      desc: `Pola spasial mengelompok sangat padat (${totalAreaPoints} titik aktif dalam 15 km) di area ${rawLandCoverClass || 'semak belukar/perkebunan'}, mengindikasikan pembakaran simultan terencana untuk pembersihan lahan baru.`,
      type: 'Kluster Masif Lahan Terbuka',
      badge: 'bg-orange-100 text-orange-950 border-orange-300 font-bold'
    };
  } else if (totalAreaPoints >= 10 && (landCover.includes('hutan') || landCover.includes('tree'))) {
    return {
      title: 'Kluster Masif di Kawasan Hutan',
      desc: `Terjadi kluster masif (${totalAreaPoints} titik aktif dalam 15 km) yang merambah kawasan tutupan pohon hutan.`,
      type: 'Kluster Masif Hutan',
      badge: 'bg-rose-100 text-rose-950 border-rose-300 font-bold'
    };
  } else if (totalAreaPoints >= 2) {
    return {
      title: 'Kluster Titik Api Aktif (Multi-Point Fire)',
      desc: `Terdapat ${totalAreaPoints} titik api aktif yang saling berdekatan dalam radius 15 km${nearestKm ? ` (jarak terdekat ~${nearestKm} km)` : ''}. Api berpotensi saling merambat dan menyatu jika arah angin sejajar.`,
      type: `Kluster (${totalAreaPoints} Titik)`,
      badge: 'bg-amber-100 text-amber-950 border-amber-300 font-semibold'
    };
  }

  return {
    title: 'Titik Api Tunggal Terisolasi',
    desc: `Tidak ada titik api lain dalam radius 15 km (${nearestKm && nearestKm < 15 ? `jarak terdekat ~${nearestKm} km` : 'terisolasi'}). Titik api berdiri sendiri tanpa indikasi kluster terdekat.`,
    type: 'Terisolasi',
    badge: 'bg-slate-100 text-slate-700 border-slate-300'
  };
}
