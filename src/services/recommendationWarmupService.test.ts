import { afterEach, describe, expect, it, vi } from 'vitest';

import { warmUpRecommendationService } from './recommendationWarmupService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('warmUpRecommendationService', () => {
  it('consulta el health endpoint del servicio de recomendaciones', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    await warmUpRecommendationService();

    expect(fetchMock).toHaveBeenCalledWith('https://movilidad-recommendation.onrender.com/health');
  });

  it('ignora fallos porque el warm-up es best-effort', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('Service unavailable'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(warmUpRecommendationService()).resolves.toBeUndefined();
  });
});
