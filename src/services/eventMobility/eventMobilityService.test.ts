import { describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { eventMobilityService } from './eventMobilityService';

vi.mock('../http/httpClient', () => ({
  httpClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

describe('eventMobilityService', () => {
  it('consulta los eventos próximos', async () => {
    const events = [{ eventId: 'ev-1', title: 'Feria', startsAt: '2030-01-01T12:00:00Z', endsAt: '2030-01-01T15:00:00Z' }];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: events });
    await expect(eventMobilityService.upcoming()).resolves.toEqual(events);
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/destinations/events');
  });

  it('calcula el plan usando el evento y el origen seleccionado', async () => {
    const decision = { mode: 'ATTENDING', dropoff: null, pickup: null, alternativeDropoff: null, message: 'ok' };
    vi.mocked(httpClient.post).mockResolvedValueOnce({ data: decision });
    await expect(eventMobilityService.decide('ev/1', { attending: true, originLatitude: -34.6, originLongitude: -58.4 })).resolves.toEqual(decision);
    expect(httpClient.post).toHaveBeenCalledWith('/api/v1/destinations/events/ev/1/mobility-decision', {
      attending: true, originLatitude: -34.6, originLongitude: -58.4,
    });
  });

  it('consulta una intención existente con eventId codificado', async () => {
    const intent = { eventId: 'ev/1', stationId: 7, arrivalAt: '2030-01-01T12:00:00Z', status: 'ACTIVE' };
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: intent });
    await expect(eventMobilityService.getArrivalIntent('ev/1')).resolves.toEqual(intent);
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/destinations/events/ev%2F1/arrival-intention');
  });

  it('registra una intención de llegada', async () => {
    const intent = { eventId: 'ev-1', stationId: 7, arrivalAt: '2030-01-01T12:00:00Z', status: 'ACTIVE' };
    vi.mocked(httpClient.put).mockResolvedValueOnce({ data: intent });
    await expect(eventMobilityService.registerArrivalIntent('ev-1', 7, intent.arrivalAt)).resolves.toEqual(intent);
    expect(httpClient.put).toHaveBeenCalledWith('/api/v1/destinations/events/ev-1/arrival-intention', { stationId: 7, arrivalAt: intent.arrivalAt });
  });

  it('cancela una intención de llegada', async () => {
    vi.mocked(httpClient.delete).mockResolvedValueOnce({ status: 204 });
    await expect(eventMobilityService.cancelArrivalIntent('ev/1')).resolves.toBeUndefined();
    expect(httpClient.delete).toHaveBeenCalledWith('/api/v1/destinations/events/ev%2F1/arrival-intention');
  });

  it('propaga errores del backend para que la interfaz los muestre', async () => {
    const error = new Error('backend offline');
    vi.mocked(httpClient.post).mockRejectedValueOnce(error);
    await expect(eventMobilityService.decide('ev-1', { attending: true })).rejects.toBe(error);
  });
});
