import type { BikeCreateRequest, BikeResponse, BikeStatusChangeRequest, BikeTransferRequest } from '../../types/bike';
import { httpClient } from '../http/httpClient';

const bikesPath = '/api/v1/bikes';

export const bikeService = {
  async getAll(): Promise<BikeResponse[]> {
    const response = await httpClient.get<BikeResponse[]>(bikesPath);
    return response.data;
  },

  async getAvailable(stationId: number): Promise<BikeResponse[]> {
    const response = await httpClient.get<BikeResponse[]>(`${bikesPath}/available`, {
      params: { stationId },
    });
    return response.data;
  },

  async getByStation(stationId: number): Promise<BikeResponse[]> {
    const response = await httpClient.get<BikeResponse[]>(`${bikesPath}/station/${stationId}`);
    return response.data;
  },

  async create(request: BikeCreateRequest): Promise<BikeResponse> {
    const response = await httpClient.post<BikeResponse>(bikesPath, request);
    return response.data;
  },

  async changeStatus(bikeId: number, request: BikeStatusChangeRequest): Promise<BikeResponse> {
    const response = await httpClient.patch<BikeResponse>(`${bikesPath}/${bikeId}/status`, request);
    return response.data;
  },

  async transfer(bikeId: number, request: BikeTransferRequest): Promise<BikeResponse> {
    const response = await httpClient.patch<BikeResponse>(`${bikesPath}/${bikeId}/station`, request);
    return response.data;
  },

  async remove(bikeId: number): Promise<void> {
    await httpClient.delete(`${bikesPath}/${bikeId}`);
  },
};
