export type RecommendationPurpose = 'PICKUP' | 'DROPOFF';
export type RecommendationStatus = 'RECOMMENDED' | 'NO_RECOMMENDATION';
export type RecommendationSource = 'MODEL' | 'FALLBACK';

export type RecommendedStation = {
  stationId: number;
  stationName: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  capacity: number;
  availableBikes: number;
  availableSlots: number;
  score: number | null;
};

export type StationRecommendationComparedStation = {
  stationId: number;
  stationName: string;
  distanceMeters: number;
  availableBikes: number;
  availableSlots: number;
};

export type StationRecommendationFactor = {
  feature: string;
  impact: number;
};

export type StationRecommendationExplanation = {
  code: string;
  comparedTo: StationRecommendationComparedStation | null;
  factors: StationRecommendationFactor[];
};

export type StationRecommendation = {
  status: RecommendationStatus;
  source: RecommendationSource;
  purpose: RecommendationPurpose;
  reason: 'NO_CANDIDATES' | 'NO_VIABLE_STATION' | null;
  message: string;
  station: RecommendedStation | null;
  alternatives: RecommendedStation[];
  explanation: StationRecommendationExplanation | null;
  modelVersion: string | null;
  generatedAt: string;
};
