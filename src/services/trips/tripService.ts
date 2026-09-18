import type { TripEndRequest, TripResponse, TripStartRequest } from '../../types/trip';
import type { PagedResponse } from '../../types/pagination';
import { httpClient } from '../http/httpClient';
import { userHeaders } from '../http/userHeaders';

const tripsPath = '/api/v1/trips';

export const tripService = {
  async getActive(userId: number): Promise<TripResponse | null> {
    const response = await httpClient.get<TripResponse>(`${tripsPath}/active`, {
      headers: userHeaders(userId),
    });
    return response.status === 204 ? null : response.data;
  },

  async start(userId: number, request: TripStartRequest): Promise<TripResponse> {
    const response = await httpClient.post<TripResponse>(tripsPath, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async end(userId: number, tripId: number, request: TripEndRequest): Promise<TripResponse> {
    const response = await httpClient.post<TripResponse>(`${tripsPath}/${tripId}/end`, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async getHistory(userId: number, page: number, size: number): Promise<PagedResponse<TripResponse>> {
    const response = await httpClient.get<PagedResponse<TripResponse>>(`${tripsPath}/history`, {
      headers: userHeaders(userId),
      params: { page, size },
    });
    return response.data;
  },
};
