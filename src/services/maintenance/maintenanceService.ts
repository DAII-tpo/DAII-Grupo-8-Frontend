import type {
  MaintenanceCompleteRequest,
  MaintenanceCreateRequest,
  MaintenanceResponse,
} from '../../types/maintenance';
import { httpClient } from '../http/httpClient';
import { userHeaders } from '../http/userHeaders';

const maintenancePath = '/api/v1/maintenance';

export const maintenanceService = {
  async getAll(userId: number): Promise<MaintenanceResponse[]> {
    const response = await httpClient.get<MaintenanceResponse[]>(maintenancePath, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async create(userId: number, request: MaintenanceCreateRequest): Promise<MaintenanceResponse> {
    const response = await httpClient.post<MaintenanceResponse>(maintenancePath, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async complete(
    userId: number,
    maintenanceId: number,
    request: MaintenanceCompleteRequest,
  ): Promise<MaintenanceResponse> {
    const response = await httpClient.patch<MaintenanceResponse>(`${maintenancePath}/${maintenanceId}/complete`, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },
};
