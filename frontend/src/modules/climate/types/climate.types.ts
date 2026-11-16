export type ClimateType = 'rainfall' | 'soil_moisture' | 'temperature';

export interface ClimateLegendCategory {
  min: number;
  max: number;
  label: string;
  category: string;
  color: string;
  range?: [number, number];
}
