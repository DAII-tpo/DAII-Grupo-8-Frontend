import { afterEach, describe, expect, it, vi } from 'vitest';

import { httpClient } from '../http/httpClient';
import { cicloviaObstructionService } from './cicloviaObstructionService';

describe('cicloviaObstructionService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('consulta las obstrucciones activas del backend y devuelve la respuesta', async () => {
    const obstructions = [{ id: 1, reclamoId: 'r-1', impactLevel: 'ALTO' }];
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: obstructions });

    await expect(cicloviaObstructionService.getActive()).resolves.toBe(obstructions);
    expect(get).toHaveBeenCalledWith('/api/v1/movilidad/obstrucciones/activas');
  });
});
