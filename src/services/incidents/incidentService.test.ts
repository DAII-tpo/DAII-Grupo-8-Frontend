import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { incidentService } from './incidentService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

describe('incidentService', () => {
  it('obtiene los tipos de incidencia activos', async () => {
    const types = [{ id: 2, code: 'FLAT_TIRE', name: 'Pinchazo', description: 'Rueda desinflada' }];
    const get = vi.mocked(httpClient.get);
    get.mockResolvedValueOnce({ data: types });

    await expect(incidentService.getTypes()).resolves.toEqual(types);
    expect(get).toHaveBeenCalledWith('/api/v1/incidents/types');
  });

  it('reporta una incidencia con el usuario y el payload requeridos', async () => {
    const request = { bikeId: 1, incidentTypeId: 2, description: 'Rueda trasera desinflada' };
    const incident = {
      id: 8,
      ...request,
      bikeCode: 'BIKE-001',
      reportedByUserId: 7,
      incidentTypeCode: 'FLAT_TIRE',
      incidentTypeName: 'Pinchazo',
      status: 'OPEN' as const,
      reportedAt: '2026-09-17T14:30:00Z',
    };
    const post = vi.mocked(httpClient.post);
    post.mockResolvedValueOnce({ data: incident });

    await expect(incidentService.report(7, request)).resolves.toEqual(incident);
    expect(post).toHaveBeenCalledWith('/api/v1/incidents', request, {
      headers: { 'X-User-Id': 7 },
    });
  });
});
