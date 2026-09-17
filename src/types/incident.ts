export type IncidentCreateRequest = {
  bikeId: number;
  incidentTypeId: number;
  description: string;
};

export type IncidentStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED';

export type IncidentResponse = {
  id: number;
  bikeId: number;
  bikeCode: string;
  reportedByUserId: number;
  incidentTypeId: number;
  incidentTypeCode: string;
  incidentTypeName: string;
  description: string;
  status: IncidentStatus;
  reportedAt: string;
};

export type IncidentTypeResponse = {
  id: number;
  code: string;
  name: string;
  description: string;
};
