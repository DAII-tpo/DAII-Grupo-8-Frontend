import type {
  AdminIncidentResponse,
  IncidentCreateRequest,
  IncidentResponse,
  IncidentStatusUpdateRequest,
  IncidentTypeResponse,
} from '../../types/incident';
import { httpClient } from '../http/httpClient';

const incidentsPath = '/api/v1/incidents';

export const incidentService = {
  async getTypes(): Promise<IncidentTypeResponse[]> {
    const response = await httpClient.get<IncidentTypeResponse[]>(`${incidentsPath}/types`);
    return response.data;
  },

  async report(request: IncidentCreateRequest): Promise<IncidentResponse> {
    const response = await httpClient.post<IncidentResponse>(incidentsPath, request);
    return response.data;
  },

  async getAll(): Promise<AdminIncidentResponse[]> {
    const response = await httpClient.get<AdminIncidentResponse[]>(incidentsPath);
    return response.data;
  },

  async updateStatus(
    incidentId: number,
    request: IncidentStatusUpdateRequest,
  ): Promise<AdminIncidentResponse> {
    const response = await httpClient.patch<AdminIncidentResponse>(`${incidentsPath}/${incidentId}/status`, request);
    return response.data;
  },
};
