import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '../http/httpClient';
import { culturalDestinationService } from './culturalDestinationService';

vi.mock('../http/httpClient', () => ({ httpClient: { get: vi.fn() } }));

describe('culturalDestinationService', () => {
  it('consulta los eventos culturales vigentes', async () => {
    const events = [{ eventId: 'evento 1', title: 'Feria' }];
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: events });
    await expect(culturalDestinationService.upcoming()).resolves.toEqual(events);
    expect(httpClient.get).toHaveBeenCalledWith('/api/v1/destinations/events');
  });

  it('escapa correctamente el identificador de evento al pedir una recomendación', async () => {
    vi.mocked(httpClient.get).mockResolvedValueOnce({ data: { status: 'NO_RECOMMENDATION' } });
    await culturalDestinationService.recommendation('evento 1/a');
    expect(httpClient.get).toHaveBeenCalledWith(
      '/api/v1/destinations/events/evento%201%2Fa/recommendation',
    );
  });
});
