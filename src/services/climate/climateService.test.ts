import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { climateService } from './climateService';

vi.mock('../http/httpClient', () => ({ httpClient: { get: vi.fn() } }));

describe('climateService', () => {
  it('consulta alertas vigentes mediante el cliente HTTP compartido', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [] });
    await expect(climateService.getCurrent()).resolves.toEqual([]);
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/climate-alerts/current');
  });

  it('consulta estados de estaciones y avisos del viaje sin headers de identidad propios', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: [] }).mockResolvedValueOnce({ data: [] });
    await climateService.getStationStatuses();
    await climateService.getTripNotifications();
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/stations/climate-status');
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/climate-alerts/trip-notifications');
  });
});
