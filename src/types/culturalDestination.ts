export type CulturalDestination = {
  eventId: string;
  title: string;
  zone: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  startsAt: string;
  endsAt: string;
  maxCapacity: number;
  registrations: number;
};
