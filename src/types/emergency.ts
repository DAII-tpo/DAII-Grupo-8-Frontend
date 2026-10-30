export type EmergencyStatus = 'PENDING' | 'CANCELLED' | 'REPORTED';

export type EmergencyPriority = 'P1' | 'P2' | 'P3' | 'P4';

export type EmergencyCreateRequest = {
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
};

export type EmergencyTriageRequest = {
  canMove: boolean;
  bleeding: boolean;
  vehicleInvolved: boolean;
};

export type EmergencyResponse = {
  id: number;
  code: string;
  status: EmergencyStatus;
  tripId: number;
  bikeId: number;
  bikeCode: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  reportedAt: string;
  cancelableUntil: string;
  triageDeadline: string;
  cancelWindowSeconds: number;
  triageWindowSeconds: number;
  canMove: boolean | null;
  bleeding: boolean | null;
  vehicleInvolved: boolean | null;
  priority: EmergencyPriority | null;
  sentAt: string | null;
};
