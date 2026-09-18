import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { incidentService } from './incidentService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
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

  it('consulta y actualiza incidencias administrativas', async () => {
    const incident = {
      id: 8,
      bikeId: 1,
      bikeCode: 'BIKE-001',
      reportedByUserId: 4,
      reportedByUserEmail: 'user@citypass.com',
      incidentTypeId: 2,
      incidentTypeCode: 'FLAT_TIRE',
      incidentTypeName: 'Pinchazo',
      description: 'Rueda desinflada',
      status: 'OPEN' as const,
      reportedAt: '2026-09-17T14:30:00Z',
      resolvedAt: null,
      resolvedByUserId: null,
    };
    const get = vi.mocked(httpClient.get);
    const patch = vi.mocked(httpClient.patch);
    get.mockResolvedValueOnce({ data: [incident] });
    patch.mockResolvedValueOnce({ data: { ...incident, status: 'UNDER_REVIEW' } });

    await expect(incidentService.getAll(7)).resolves.toEqual([incident]);
    await expect(incidentService.updateStatus(7, 8, { status: 'UNDER_REVIEW' })).resolves.toMatchObject({
      status: 'UNDER_REVIEW',
    });
    expect(get).toHaveBeenCalledWith('/api/v1/incidents', { headers: { 'X-User-Id': 7 } });
    expect(patch).toHaveBeenCalledWith('/api/v1/incidents/8/status', { status: 'UNDER_REVIEW' }, {
      headers: { 'X-User-Id': 7 },
    });
  });
});
