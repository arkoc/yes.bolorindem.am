export type HeatmapPoint = {
  id: string;
  lat: number;
  lng: number;
  points: number;
  claimed_by: string | null;
  claimed_at: string | null;
  claimer_name: string | null;
};
