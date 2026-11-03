export type ClimateType = 'rainfall' | 'soil_moisture' | 'temperature';

export interface ClimateLegendCategory {
  label: string;
  category: string;
  color: string;
  range: [number, number];
}
