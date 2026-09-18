export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';

export type Station = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  capacity: number;
  status: StationStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type StationRequest = {
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  capacity: number;
  status?: StationStatus;
};
