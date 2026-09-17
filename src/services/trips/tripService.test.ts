import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { tripService } from './tripService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

const trip = {
  id: 3,
  status: 'ACTIVE' as const,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  originStationId: 2,
  originStationName: 'Estacion Centro',
  destinationStationId: null,
  destinationStationName: null,
  startedAt: '2026-09-15T14:00:00Z',
  endedAt: null,
  durationSeconds: null,
};

describe('tripService', () => {
  it('devuelve null cuando el usuario no tiene viaje activo', async () => {
    const get = vi.mocked(httpClient.get);
    get.mockResolvedValueOnce({ status: 204, data: undefined });

    await expect(tripService.getActive(7)).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith('/api/v1/trips/active', {
      headers: { 'X-User-Id': 7 },
    });
  });

  it('inicia un viaje con el usuario temporal configurado', async () => {
    const post = vi.mocked(httpClient.post);
    post.mockResolvedValueOnce({ data: trip });

    await expect(tripService.start(7, { bikeId: 1 })).resolves.toEqual(trip);
    expect(post).toHaveBeenCalledWith('/api/v1/trips', { bikeId: 1 }, {
      headers: { 'X-User-Id': 7 },
    });
  });
});
