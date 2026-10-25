export interface Island {
  id: string;
  name: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
}

export interface Province {
  id: string;
  name: string;
  islandId: string;
  center: [number, number];
  zoom: number;
  bbox: [number, number, number, number];
}

export const ISLANDS: Island[] = [
  { id: 'ALL', name: 'Seluruh Indonesia (Semua Pulau)', center: [-0.7893, 113.9213], zoom: 5, bbox: [94, -11, 141.5, 6.5] },
  { id: 'SUMATERA', name: 'Pulau Sumatera', center: [-0.5, 101.5], zoom: 6, bbox: [95, -6, 109, 6.1] },
  { id: 'KALIMANTAN', name: 'Pulau Kalimantan', center: [-1, 113.5], zoom: 6, bbox: [108.5, -4.5, 119.2, 4.5] },
  { id: 'JAWA', name: 'Pulau Jawa', center: [-7.3, 110], zoom: 7, bbox: [105, -8.9, 115, -5.8] },
  { id: 'SULAWESI', name: 'Pulau Sulawesi', center: [-2, 121], zoom: 6, bbox: [118.5, -7, 125.8, 2.5] },
  { id: 'NUSA_TENGGARA', name: 'Bali & Nusa Tenggara', center: [-8.6, 117.5], zoom: 7, bbox: [114.4, -11, 125.2, -8] },
  { id: 'MALUKU', name: 'Kepulauan Maluku', center: [-3.2, 128.5], zoom: 6, bbox: [124, -9, 132, 2.7] },
  { id: 'PAPUA', name: 'Pulau Papua', center: [-4, 138], zoom: 6, bbox: [130.5, -9.5, 141, 1] },
];

export const PROVINCES: Province[] = [
  { id: 'ACEH', name: 'Aceh', islandId: 'SUMATERA', center: [4.2, 96.9], zoom: 8, bbox: [95, 2, 98.3, 6.1] },
  { id: 'SUMUT', name: 'Sumatera Utara', islandId: 'SUMATERA', center: [2.1, 99.1], zoom: 8, bbox: [97, 0.3, 100.6, 4.3] },
  { id: 'SUMBAR', name: 'Sumatera Barat', islandId: 'SUMATERA', center: [-0.7, 100.6], zoom: 8, bbox: [98.6, -3.5, 101.9, 0.9] },
  { id: 'RIAU', name: 'Riau', islandId: 'SUMATERA', center: [0.5, 101.8], zoom: 8, bbox: [100, -1.1, 103.8, 2.5] },
  { id: 'KEPRI', name: 'Kepulauan Riau', islandId: 'SUMATERA', center: [3.9, 108.2], zoom: 7, bbox: [103.2, -1, 109.2, 4.8] },
  { id: 'JAMBI', name: 'Jambi', islandId: 'SUMATERA', center: [-1.6, 102.7], zoom: 8, bbox: [101.1, -2.8, 104.5, -0.7] },
  { id: 'SUMSEL', name: 'Sumatera Selatan', islandId: 'SUMATERA', center: [-3.2, 104], zoom: 8, bbox: [102, -4.9, 106.1, -1.6] },
  { id: 'BABEL', name: 'Bangka Belitung', islandId: 'SUMATERA', center: [-2.7, 106.5], zoom: 8, bbox: [105.1, -3.7, 108.7, -1.5] },
  { id: 'BENGKULU', name: 'Bengkulu', islandId: 'SUMATERA', center: [-3.8, 102.3], zoom: 8, bbox: [101, -5.5, 103.8, -2.3] },
  { id: 'LAMPUNG', name: 'Lampung', islandId: 'SUMATERA', center: [-4.9, 105], zoom: 8, bbox: [103.6, -6, 106, -3.7] },
  { id: 'KALBAR', name: 'Kalimantan Barat', islandId: 'KALIMANTAN', center: [-0.1, 111.1], zoom: 8, bbox: [108, -3.1, 114.2, 2.1] },
  { id: 'KALTENG', name: 'Kalimantan Tengah', islandId: 'KALIMANTAN', center: [-1.6, 113.4], zoom: 8, bbox: [110.7, -3.6, 115.8, 0.8] },
  { id: 'KALSEL', name: 'Kalimantan Selatan', islandId: 'KALIMANTAN', center: [-2.9, 115.4], zoom: 8, bbox: [114.3, -4.2, 116.6, -1.3] },
  { id: 'KALTIM', name: 'Kalimantan Timur', islandId: 'KALIMANTAN', center: [0.5, 116.4], zoom: 8, bbox: [113.8, -2.5, 119, 2.6] },
  { id: 'KALTARA', name: 'Kalimantan Utara', islandId: 'KALIMANTAN', center: [3, 116], zoom: 8, bbox: [114.5, 1.2, 118, 4.4] },
  { id: 'JAKARTA', name: 'DKI Jakarta', islandId: 'JAWA', center: [-6.2, 106.8], zoom: 11, bbox: [106.6, -6.4, 107, -6] },
  { id: 'JABAR', name: 'Jawa Barat', islandId: 'JAWA', center: [-6.9, 107.6], zoom: 9, bbox: [106.3, -7.8, 108.9, -5.9] },
  { id: 'BANTEN', name: 'Banten', islandId: 'JAWA', center: [-6.4, 106.1], zoom: 9, bbox: [105.1, -7, 106.8, -5.8] },
  { id: 'JATENG', name: 'Jawa Tengah', islandId: 'JAWA', center: [-7.2, 110.1], zoom: 9, bbox: [108.9, -8.2, 111.6, -6.4] },
  { id: 'YOGYA', name: 'DI Yogyakarta', islandId: 'JAWA', center: [-7.9, 110.4], zoom: 10, bbox: [110, -8.2, 110.8, -7.5] },
  { id: 'JATIM', name: 'Jawa Timur', islandId: 'JAWA', center: [-7.5, 112.5], zoom: 8, bbox: [110.9, -8.8, 114.6, -6.7] },
  { id: 'SULUT', name: 'Sulawesi Utara', islandId: 'SULAWESI', center: [1.3, 124.8], zoom: 8, bbox: [123.5, 0.3, 127.2, 4.6] },
  { id: 'GORONTALO', name: 'Gorontalo', islandId: 'SULAWESI', center: [0.7, 122.4], zoom: 8, bbox: [121.2, 0.3, 123.6, 1.3] },
  { id: 'SULTENG', name: 'Sulawesi Tengah', islandId: 'SULAWESI', center: [-1.4, 121.4], zoom: 8, bbox: [119.4, -3.5, 124.3, 1.4] },
  { id: 'SULBAR', name: 'Sulawesi Barat', islandId: 'SULAWESI', center: [-2.4, 119.3], zoom: 8, bbox: [118.7, -3.6, 119.9, -1] },
  { id: 'SULSEL', name: 'Sulawesi Selatan', islandId: 'SULAWESI', center: [-3.8, 119.9], zoom: 8, bbox: [118.8, -7.2, 121.7, -2] },
  { id: 'SULTRA', name: 'Sulawesi Tenggara', islandId: 'SULAWESI', center: [-4.1, 122.2], zoom: 8, bbox: [120.8, -6.2, 124.1, -2.7] },
  { id: 'BALI', name: 'Bali', islandId: 'NUSA_TENGGARA', center: [-8.4, 115.1], zoom: 10, bbox: [114.4, -8.9, 115.7, -8] },
  { id: 'NTB', name: 'Nusa Tenggara Barat', islandId: 'NUSA_TENGGARA', center: [-8.6, 117.4], zoom: 9, bbox: [115.8, -9.1, 119.3, -8.1] },
  { id: 'NTT', name: 'Nusa Tenggara Timur', islandId: 'NUSA_TENGGARA', center: [-9.5, 122.5], zoom: 8, bbox: [118.9, -11, 125.2, -8] },
  { id: 'MALUKU', name: 'Maluku', islandId: 'MALUKU', center: [-3.2, 129.5], zoom: 7, bbox: [125.7, -8.3, 131.6, -1.3] },
  { id: 'MALUT', name: 'Maluku Utara', islandId: 'MALUKU', center: [0.6, 127.8], zoom: 8, bbox: [124.2, -2.5, 129, 2.7] },
  { id: 'PAPUA', name: 'Papua', islandId: 'PAPUA', center: [-2.5, 140], zoom: 7, bbox: [137, -4.5, 141, -1.5] },
  { id: 'PAPUA_BARAT', name: 'Papua Barat', islandId: 'PAPUA', center: [-1.5, 133], zoom: 7, bbox: [129, -4.3, 135.5, 1] },
  { id: 'PAPUA_BDAY', name: 'Papua Barat Daya', islandId: 'PAPUA', center: [-1, 131.5], zoom: 8, bbox: [130, -2.5, 132.8, 1] },
  { id: 'PAPUA_TENGAH', name: 'Papua Tengah', islandId: 'PAPUA', center: [-3.8, 136.5], zoom: 8, bbox: [134.5, -5, 138.2, -2.5] },
  { id: 'PAPUA_PEGUNUNGEN', name: 'Papua Pegunungan', islandId: 'PAPUA', center: [-4.2, 139.2], zoom: 8, bbox: [137.5, -5.5, 140.8, -3.5] },
  { id: 'PAPUA_SELATAN', name: 'Papua Selatan', islandId: 'PAPUA', center: [-6.8, 139.5], zoom: 8, bbox: [137.5, -9.1, 141, -5] },
];
