import { httpClient } from '../http/httpClient';
import type { Station } from '../../types/station';

const stationsPath = '/api/v1/stations';

export const stationService = {
  async getAll(): Promise<Station[]> {
    const response = await httpClient.get<Station[]>(stationsPath);
    return response.data;
  },
};
