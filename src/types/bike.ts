export type BikeStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'STOLEN';

export type BikeResponse = {
  id: number;
  code: string;
  stationId: number | null;
  stationName: string | null;
  status: BikeStatus;
  model: string | null;
  purchaseDate: string | null;
  lastMaintenanceAt: string | null;
  createdAt: string;
  updatedAt: string;
};
