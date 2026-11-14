import type { ClimateAlert, ClimateTripNotification, StationClimateStatus } from '../../types/climateAlert';
import { httpClient } from '../http/httpClient';

const climatePath = '/api/v1/climate-alerts';

export const climateService = {
  async getCurrent(): Promise<ClimateAlert[]> {
    const response = await httpClient.get<ClimateAlert[]>(`${climatePath}/current`);
    return response.data;
  },

  async getStationStatuses(): Promise<StationClimateStatus[]> {
    const response = await httpClient.get<StationClimateStatus[]>('/api/v1/stations/climate-status');
    return response.data;
  },

  async getTripNotifications(): Promise<ClimateTripNotification[]> {
    const response = await httpClient.get<ClimateTripNotification[]>(`${climatePath}/trip-notifications`);
    return response.data;
  },
};
