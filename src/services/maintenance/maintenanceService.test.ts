import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { maintenanceService } from './maintenanceService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}));

describe('maintenanceService', () => {
  it('consulta, crea y finaliza mantenimientos con el usuario administrador', async () => {
    const maintenance = {
      id: 3,
      bikeId: 1,
      bikeCode: 'BIKE-001',
      incidentId: 8,
      createdByUserId: 7,
      description: 'Revisar rueda',
      status: 'IN_PROGRESS' as const,
      startedAt: '2026-09-17T14:30:00Z',
      completedAt: null,
      resolution: null,
    };
    const get = vi.mocked(httpClient.get);
    const post = vi.mocked(httpClient.post);
    const patch = vi.mocked(httpClient.patch);
    get.mockResolvedValueOnce({ data: [maintenance] });
    post.mockResolvedValueOnce({ data: maintenance });
    patch.mockResolvedValueOnce({ data: { ...maintenance, status: 'COMPLETED', resolution: 'Rueda reparada' } });

    await expect(maintenanceService.getAll(7)).resolves.toEqual([maintenance]);
    await expect(maintenanceService.create(7, {
      bikeId: 1,
      incidentId: 8,
      description: 'Revisar rueda',
    })).resolves.toEqual(maintenance);
    await expect(maintenanceService.complete(7, 3, { resolution: 'Rueda reparada' })).resolves.toMatchObject({
      status: 'COMPLETED',
    });
    expect(get).toHaveBeenCalledWith('/api/v1/maintenance', { headers: { 'X-User-Id': 7 } });
    expect(post).toHaveBeenCalledWith('/api/v1/maintenance', {
      bikeId: 1,
      incidentId: 8,
      description: 'Revisar rueda',
    }, { headers: { 'X-User-Id': 7 } });
    expect(patch).toHaveBeenCalledWith('/api/v1/maintenance/3/complete', { resolution: 'Rueda reparada' }, {
      headers: { 'X-User-Id': 7 },
    });
  });
});
