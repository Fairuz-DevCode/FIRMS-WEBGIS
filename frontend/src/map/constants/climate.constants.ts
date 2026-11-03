export interface ClimateLegendCategory {
  min: number;
  max: number;
  label: string;
  category: string;
  color: string;
}

export const RAINFALL_SCALES: ClimateLegendCategory[] = [
  { min: 0, max: 5, label: '< 5 mm', category: 'Kering / Sangat Ringan', color: '#bae6fd' },
  { min: 5, max: 20, label: '5 - 20 mm', category: 'Hujan Sedang', color: '#38bdf8' },
  { min: 20, max: 50, label: '20 - 50 mm', category: 'Hujan Lebat', color: '#0284c7' },
  { min: 50, max: 999, label: '> 50 mm', category: 'Sangat Lebat (Ekstrem)', color: '#4f46e5' },
];

export const SOIL_MOISTURE_SCALES: ClimateLegendCategory[] = [
  { min: 0, max: 0.2, label: '< 0.20 m³/m³', category: 'Sangat Kering (Kritis)', color: '#d97706' },
  { min: 0.2, max: 0.35, label: '0.20 - 0.35 m³/m³', category: 'Cukup Lembab', color: '#84cc16' },
  { min: 0.35, max: 1, label: '> 0.35 m³/m³', category: 'Lembab / Jenuh Air', color: '#06b6d4' },
];

export const TEMPERATURE_SCALES: ClimateLegendCategory[] = [
  { min: 0, max: 26, label: '< 26 °C', category: 'Sejuk / Rendah', color: '#fde047' },
  { min: 26, max: 32, label: '26 - 32 °C', category: 'Hangat Normal', color: '#fb923c' },
  { min: 32, max: 100, label: '> 32 °C', category: 'Panas Ekstrem', color: '#ef4444' },
];

export function getRainfallColor(val: number): string {
  if (val < 5) return '#bae6fd';
  if (val <= 20) return '#38bdf8';
  if (val <= 50) return '#0284c7';
  return '#4f46e5';
}

export function getSoilMoistureColor(val: number): string {
  if (val < 0.2) return '#d97706';
  if (val <= 0.35) return '#84cc16';
  return '#06b6d4';
}

export function getTemperatureColor(val: number): string {
  if (val < 26) return '#fde047';
  if (val <= 32) return '#fb923c';
  return '#ef4444';
}
