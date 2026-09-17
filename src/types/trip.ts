export type TripStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'INCIDENT';

export type TripStartRequest = {
  bikeId: number;
};

export type TripEndRequest = {
  destinationStationId: number;
};

export type TripResponse = {
  id: number;
  status: TripStatus;
  bikeId: number;
  bikeCode: string;
  originStationId: number;
  originStationName: string;
  destinationStationId: number | null;
  destinationStationName: string | null;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
};
