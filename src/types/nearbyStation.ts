export type NearbyStation = {
  stationId: number;
  stationName: string;
  address: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  capacity: number;
  availableBikes: number;
  availableSlots: number;
};
