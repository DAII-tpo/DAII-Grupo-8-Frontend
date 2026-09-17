import type { BikeResponse } from '../../types/bike';
import { httpClient } from '../http/httpClient';

const bikesPath = '/api/v1/bikes';

export const bikeService = {
  async getAvailable(stationId: number): Promise<BikeResponse[]> {
    const response = await httpClient.get<BikeResponse[]>(`${bikesPath}/available`, {
      params: { stationId },
    });
    return response.data;
  },
};
