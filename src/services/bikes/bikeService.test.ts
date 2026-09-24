import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { bikeService } from './bikeService';

vi.mock('../http/httpClient', () => ({
  httpClient: { delete: vi.fn(), get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

describe('bikeService', () => {
  it('obtiene todas las bicicletas sin headers adicionales', async () => {
    const bikes = [{ id: 1, code: 'BIKE-001', stationId: null, stationName: null, status: 'IN_USE' as const, model: null, purchaseDate: null, lastMaintenanceAt: null, createdAt: '2026-09-01T10:00:00Z', updatedAt: '2026-09-01T10:00:00Z' }];
    const get = vi.mocked(httpClient.get);
    get.mockResolvedValueOnce({ data: bikes });

    await expect(bikeService.getAll()).resolves.toEqual(bikes);
    expect(get).toHaveBeenCalledWith('/api/v1/bikes');
  });

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

  it('administra bicicletas por estación sin headers adicionales', async () => {
    const bike = { id: 1, code: 'B-1', stationId: 2, stationName: 'Centro', status: 'AVAILABLE' as const, model: null, purchaseDate: null, lastMaintenanceAt: null, createdAt: '', updatedAt: '' };
    const get = vi.mocked(httpClient.get); const post = vi.mocked(httpClient.post); const patch = vi.mocked(httpClient.patch); const remove = vi.mocked(httpClient.delete);
    get.mockResolvedValueOnce({ data: [bike] }); post.mockResolvedValueOnce({ data: bike }); patch.mockResolvedValue({ data: bike }); remove.mockResolvedValueOnce({});
    await bikeService.getByStation(2); await bikeService.create({ code: 'B-1', stationId: 2, status: 'AVAILABLE', model: null, purchaseDate: null }); await bikeService.changeStatus(1, { status: 'MAINTENANCE', reason: null }); await bikeService.transfer(1, { stationId: 3 }); await bikeService.remove(1);
    expect(get).toHaveBeenCalledWith('/api/v1/bikes/station/2'); expect(post).toHaveBeenCalled(); expect(patch).toHaveBeenCalledTimes(2); expect(remove).toHaveBeenCalledWith('/api/v1/bikes/1');
  });
});
