import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { stationService } from './stationService';

vi.mock('../http/httpClient', () => ({
  httpClient: {
    get: vi.fn(), patch: vi.fn(), post: vi.fn(),
  },
}));

describe('stationService', () => {
  it('obtiene las estaciones desde el endpoint del backend', async () => {
    const get = vi.mocked(httpClient.get);
    const stations = [
      {
        id: 1,
        name: 'Estacion Centro',
        address: 'Av. Corrientes 100',
        latitude: -34.6037,
        longitude: -58.3816,
        capacity: 20,
        status: 'ACTIVE' as const,
        createdAt: '2026-09-01T12:00:00Z',
        updatedAt: '2026-09-01T12:00:00Z',
        deletedAt: null,
      },
    ];

    get.mockResolvedValueOnce({ data: stations });

    await expect(stationService.getAll()).resolves.toEqual(stations);
    expect(get).toHaveBeenCalledWith('/api/v1/stations');
  });

  it('obtiene la disponibilidad de una estación desde el endpoint del backend', async () => {
    const get = vi.mocked(httpClient.get);
    const availability = {
      stationId: 1,
      stationName: 'Estacion Centro',
      status: 'ACTIVE' as const,
      capacity: 20,
      availableBikes: 7,
      availableSlots: 13,
      checkedAt: '2026-09-08T14:30:00Z',
    };

    get.mockResolvedValueOnce({ data: availability });

    await expect(stationService.getAvailability(1)).resolves.toEqual(availability);
    expect(get).toHaveBeenCalledWith('/api/v1/stations/1/availability');
  });

  it('obtiene estaciones cercanas con las coordenadas indicadas', async () => {
    const get = vi.mocked(httpClient.get);
    const stations = [
      {
        stationId: 1,
        stationName: 'Estacion Centro',
        address: 'Av. Corrientes 100',
        latitude: -34.6037,
        longitude: -58.3816,
        distanceMeters: 320,
        capacity: 20,
        availableBikes: 7,
        availableSlots: 13,
      },
    ];

    get.mockResolvedValueOnce({ data: stations });

    await expect(stationService.getNearby({ lat: -34.6037, lng: -58.3816 })).resolves.toEqual(stations);
    expect(get).toHaveBeenCalledWith('/api/v1/stations/nearby', {
      params: { lat: -34.6037, lng: -58.3816 },
    });
  });

  it('crea y actualiza una estación con el body completo', async () => {
    const request = { name: 'Nueva', address: null, latitude: -34.6, longitude: -58.4, capacity: 10, status: 'ACTIVE' as const };
    const post = vi.mocked(httpClient.post); const patch = vi.mocked(httpClient.patch);
    post.mockResolvedValueOnce({ data: request }); patch.mockResolvedValueOnce({ data: { ...request, status: 'INACTIVE' } });
    await stationService.create(request); await stationService.update(2, request);
    expect(post).toHaveBeenCalledWith('/api/v1/stations', request);
    expect(patch).toHaveBeenCalledWith('/api/v1/stations/2', request);
  });
});
