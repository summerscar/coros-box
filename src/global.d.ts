export interface Activity {
  imageData?: string;
  time: number;
  title: string;
  formattedTitle: string;
  distance: string;
  pace: string;
  totalTime: string;
  device: string;
  imageUrl: string;
  relativeTime: string;
}

export type Activities = Activity[];

export type Summary = {
  avgHeartRate: number;
  count: number;
  distance: number;
  duration: number;
  sportType: number;
  trainingLoad: number;
};
