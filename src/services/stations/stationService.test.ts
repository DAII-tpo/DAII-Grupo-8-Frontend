import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { stationService } from './stationService';

vi.mock('../http/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
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
});
