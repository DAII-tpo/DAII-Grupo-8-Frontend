import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { bikeService } from './bikeService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn() },
}));

describe('bikeService', () => {
  it('obtiene las bicicletas disponibles de una estación', async () => {
    const bikes = [{
      id: 1,
      code: 'BIKE-001',
      stationId: 2,
      stationName: 'Estacion Centro',
      status: 'AVAILABLE' as const,
      model: null,
      purchaseDate: null,
      lastMaintenanceAt: null,
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-09-01T10:00:00Z',
    }];
    const get = vi.mocked(httpClient.get);
    get.mockResolvedValueOnce({ data: bikes });

    await expect(bikeService.getAvailable(2)).resolves.toEqual(bikes);
    expect(get).toHaveBeenCalledWith('/api/v1/bikes/available', { params: { stationId: 2 } });
  });
});
