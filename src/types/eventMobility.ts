import type { StationRecommendation } from './stationRecommendation';

export type CulturalDestination = {
  eventId: string; title: string; zone: string | null; address: string | null;
  latitude: number; longitude: number; startsAt: string; endsAt: string;
  maxCapacity: number; registrations: number; expectedDemand: number;
};

export type EventMobilityDecisionRequest = {
  attending: boolean; originLatitude?: number; originLongitude?: number;
};

export type EventStationProjection = {
  stationId: number; availableSlots: number; projectedArrivals: number;
  projectedBalance: number; projectedAvailableSlots: number;
  saturationRisk: 'LOW' | 'HIGH' | 'SATURATED';
};

export type EventArrivalIntent = {
  eventId: string; stationId: number; arrivalAt: string; status: 'ACTIVE' | 'CANCELLED';
};

export type EventMobilityDecision = {
  mode: 'ATTENDING' | 'AVOIDING_EVENT';
  pickup: StationRecommendation | null; dropoff: StationRecommendation | null;
  alternativeDropoff: StationRecommendation | null;
  message: string;
  stationProjections?: EventStationProjection[];
};
