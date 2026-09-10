import { httpClient } from '../http/httpClient';
import type { Station } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';

const stationsPath = '/api/v1/stations';

export const stationService = {
  async getAll(): Promise<Station[]> {
    const response = await httpClient.get<Station[]>(stationsPath);
    return response.data;
  },

  async getAvailability(stationId: number): Promise<StationAvailability> {
    const response = await httpClient.get<StationAvailability>(`${stationsPath}/${stationId}/availability`);
    return response.data;
  },
};
