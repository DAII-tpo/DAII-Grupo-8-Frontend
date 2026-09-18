import { httpClient } from '../http/httpClient';
import type { NearbyStation } from '../../types/nearbyStation';
import type { Station } from '../../types/station';
import type { StationRequest } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';

const stationsPath = '/api/v1/stations';

type NearbyStationsQuery = {
  lat: number;
  lng: number;
  radius?: number;
  limit?: number;
};

export const stationService = {
  async getAll(): Promise<Station[]> {
    const response = await httpClient.get<Station[]>(stationsPath);
    return response.data;
  },

  async getAvailability(stationId: number): Promise<StationAvailability> {
    const response = await httpClient.get<StationAvailability>(`${stationsPath}/${stationId}/availability`);
    return response.data;
  },

  async getNearby({ lat, lng, radius, limit }: NearbyStationsQuery): Promise<NearbyStation[]> {
    const response = await httpClient.get<NearbyStation[]>(`${stationsPath}/nearby`, {
      params: {
        lat,
        lng,
        ...(radius === undefined ? {} : { radius }),
        ...(limit === undefined ? {} : { limit }),
      },
    });
    return response.data;
  },

  async create(request: StationRequest): Promise<Station> {
    const response = await httpClient.post<Station>(stationsPath, request);
    return response.data;
  },

  async update(stationId: number, request: StationRequest): Promise<Station> {
    const response = await httpClient.patch<Station>(`${stationsPath}/${stationId}`, request);
    return response.data;
  },
};
