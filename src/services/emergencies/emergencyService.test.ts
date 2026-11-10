import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { emergencyService } from './emergencyService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn() },
}));

const emergency = {
  id: 91,
  code: 'EMG-20261029-0091',
  status: 'PENDING' as const,
  tripId: 3,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  latitude: -34.6037,
  longitude: -58.3816,
  accuracyMeters: 12.5,
  reportedAt: '2026-10-29T22:00:00Z',
  cancelableUntil: '2026-10-29T22:00:10Z',
  triageDeadline: '2026-10-29T22:01:10Z',
  cancelWindowSeconds: 10,
  triageWindowSeconds: 60,
  canMove: null,
  bleeding: null,
  vehicleInvolved: null,
  priority: null,
  sentAt: null,
};

describe('emergencyService', () => {
  it('pide ayuda con la ubicación sobre el viaje en curso', async () => {
    const post = vi.mocked(httpClient.post);
    post.mockResolvedValueOnce({ data: emergency });
    const location = { latitude: -34.6037, longitude: -58.3816, accuracyMeters: 12.5 };

    await expect(emergencyService.report(7, 3, location)).resolves.toEqual(emergency);
    expect(post).toHaveBeenCalledWith('/api/v1/trips/3/emergencies', location, {
      headers: { 'X-User-Id': 7 },
    });
  });

  it('devuelve null cuando no hay emergencia en curso', async () => {
    const get = vi.mocked(httpClient.get);
    get.mockResolvedValueOnce({ status: 204, data: undefined });

    await expect(emergencyService.getCurrent(7)).resolves.toBeNull();
    expect(get).toHaveBeenCalledWith('/api/v1/emergencies/current', { headers: { 'X-User-Id': 7 } });
  });

  it('devuelve la emergencia en curso', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, data: emergency });

    await expect(emergencyService.getCurrent(7)).resolves.toEqual(emergency);
  });

  it('cancela y envía el cuestionario de la emergencia', async () => {
    const post = vi.mocked(httpClient.post);
    post.mockResolvedValueOnce({ data: { ...emergency, status: 'CANCELLED' } });
    post.mockResolvedValueOnce({ data: { ...emergency, status: 'REPORTED', priority: 'P3' } });
    const answers = { canMove: true, bleeding: false, vehicleInvolved: false };

    await expect(emergencyService.cancel(7, 91)).resolves.toMatchObject({ status: 'CANCELLED' });
    await expect(emergencyService.submitTriage(7, 91, answers)).resolves.toMatchObject({ priority: 'P3' });
    expect(post).toHaveBeenCalledWith('/api/v1/emergencies/91/cancel', null, { headers: { 'X-User-Id': 7 } });
    expect(post).toHaveBeenCalledWith('/api/v1/emergencies/91/triage', answers, { headers: { 'X-User-Id': 7 } });
  });
});
