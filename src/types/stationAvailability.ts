import type { StationStatus } from './station';

export type StationAvailability = {
  stationId: number;
  stationName: string;
  status: StationStatus;
  capacity: number;
  availableBikes: number;
  availableSlots: number;
  checkedAt: string;
};
