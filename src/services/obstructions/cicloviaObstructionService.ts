import { httpClient } from '../http/httpClient';
import type { CicloviaObstruction } from '../../types/cicloviaObstruction';

export const cicloviaObstructionService = {
  async getActive(): Promise<CicloviaObstruction[]> {
    const response = await httpClient.get<CicloviaObstruction[]>('/api/v1/movilidad/obstrucciones/activas');
    return response.data;
  },
};
