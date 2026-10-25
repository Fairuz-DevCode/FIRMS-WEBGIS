export type ResearchModule = 'BATAS_WILAYAH' | 'PENGGUNAAN_LAHAN' | 'HIDROLOGI' | 'HOTSPOT';

export interface ResearchModuleConfig {
  id: ResearchModule;
  label: string;
  description: string;
}

export const RESEARCH_MODULES: Record<ResearchModule, ResearchModuleConfig> = {
  BATAS_WILAYAH: {
    id: 'BATAS_WILAYAH',
    label: 'Batas Wilayah & Administrasi',
    description: 'Peta batas wilayah administratif Indonesia, provinsi, dan pulau',
  },
  PENGGUNAAN_LAHAN: {
    id: 'PENGGUNAAN_LAHAN',
    label: 'Tutupan & Penggunaan Lahan (LULC)',
    description: 'Monitoring tutupan lahan Esri Sentinel-2 10m dan klasifikasi kawasan',
  },
  HIDROLOGI: {
    id: 'HIDROLOGI',
    label: 'Hidrologi & Kelembaban Gambut',
    description: 'Kawasan lahan gambut, curah hujan harian, dan kelembaban tanah',
  },
  HOTSPOT: {
    id: 'HOTSPOT',
    label: 'Deteksi Titik Panas Satelit',
    description: 'Pemantauan hotspot NASA FIRMS real-time dengan sensor VIIRS & MODIS',
  },
};
