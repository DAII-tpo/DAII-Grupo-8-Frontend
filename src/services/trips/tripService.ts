import type { TripEndRequest, TripResponse, TripStartRequest } from '../../types/trip';
import { httpClient } from '../http/httpClient';

const tripsPath = '/api/v1/trips';

function userHeaders(userId: number) {
  return { 'X-User-Id': userId };
}

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
};
