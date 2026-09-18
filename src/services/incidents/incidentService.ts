import type {
  AdminIncidentResponse,
  IncidentCreateRequest,
  IncidentResponse,
  IncidentStatusUpdateRequest,
  IncidentTypeResponse,
} from '../../types/incident';
import { httpClient } from '../http/httpClient';
import { userHeaders } from '../http/userHeaders';

const incidentsPath = '/api/v1/incidents';

export const incidentService = {
  async getTypes(): Promise<IncidentTypeResponse[]> {
    const response = await httpClient.get<IncidentTypeResponse[]>(`${incidentsPath}/types`);
    return response.data;
  },

  async report(userId: number, request: IncidentCreateRequest): Promise<IncidentResponse> {
    const response = await httpClient.post<IncidentResponse>(incidentsPath, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async getAll(userId: number): Promise<AdminIncidentResponse[]> {
    const response = await httpClient.get<AdminIncidentResponse[]>(incidentsPath, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async updateStatus(
    userId: number,
    incidentId: number,
    request: IncidentStatusUpdateRequest,
  ): Promise<AdminIncidentResponse> {
    const response = await httpClient.patch<AdminIncidentResponse>(`${incidentsPath}/${incidentId}/status`, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },
};
