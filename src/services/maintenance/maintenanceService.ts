import type {
  MaintenanceCompleteRequest,
  MaintenanceCreateRequest,
  MaintenanceResponse,
} from '../../types/maintenance';
import { httpClient } from '../http/httpClient';

const maintenancePath = '/api/v1/maintenance';

export const maintenanceService = {
  async getAll(): Promise<MaintenanceResponse[]> {
    const response = await httpClient.get<MaintenanceResponse[]>(maintenancePath);
    return response.data;
  },

  async create(request: MaintenanceCreateRequest): Promise<MaintenanceResponse> {
    const response = await httpClient.post<MaintenanceResponse>(maintenancePath, request);
    return response.data;
  },

  async complete(
    maintenanceId: number,
    request: MaintenanceCompleteRequest,
  ): Promise<MaintenanceResponse> {
    const response = await httpClient.patch<MaintenanceResponse>(`${maintenancePath}/${maintenanceId}/complete`, request);
    return response.data;
  },
};
