import type { TripEndRequest, TripResponse, TripStartRequest } from '../../types/trip';
import type { PagedResponse } from '../../types/pagination';
import { httpClient } from '../http/httpClient';

const tripsPath = '/api/v1/trips';

export const tripService = {
  async getActive(): Promise<TripResponse | null> {
    const response = await httpClient.get<TripResponse>(`${tripsPath}/active`);
    return response.status === 204 ? null : response.data;
  },

  async start(request: TripStartRequest): Promise<TripResponse> {
    const response = await httpClient.post<TripResponse>(tripsPath, request);
    return response.data;
  },

  async end(tripId: number, request: TripEndRequest): Promise<TripResponse> {
    const response = await httpClient.post<TripResponse>(`${tripsPath}/${tripId}/end`, request);
    return response.data;
  },

  async getHistory(page: number, size: number): Promise<PagedResponse<TripResponse>> {
    const response = await httpClient.get<PagedResponse<TripResponse>>(`${tripsPath}/history`, { params: { page, size } });
    return response.data;
  },
};
