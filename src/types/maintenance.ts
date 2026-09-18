export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MaintenanceCreateRequest = {
  bikeId: number;
  incidentId: number | null;
  description: string;
};

export type MaintenanceCompleteRequest = {
  resolution: string;
};

export type MaintenanceResponse = {
  id: number;
  bikeId: number;
  bikeCode: string;
  incidentId: number | null;
  createdByUserId: number;
  description: string;
  status: MaintenanceStatus;
  startedAt: string;
  completedAt: string | null;
  resolution: string | null;
};
