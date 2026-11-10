import type {
  EmergencyCreateRequest,
  EmergencyResponse,
  EmergencyTriageRequest,
} from '../../types/emergency';
import { httpClient } from '../http/httpClient';

const emergenciesPath = '/api/v1/emergencies';

export const emergencyService = {
  /** Pide ayuda durante el viaje: lo pausa y bloquea la bici. Emergencias se entera después del cuestionario. */
  async report(tripId: number, request: EmergencyCreateRequest): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`/api/v1/trips/${tripId}/emergencies`, request);
    return response.data;
  },

  async getCurrent(): Promise<EmergencyResponse | null> {
    const response = await httpClient.get<EmergencyResponse>(`${emergenciesPath}/current`);
    return response.status === 204 ? null : response.data;
  },

  async cancel(emergencyId: number): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`${emergenciesPath}/${emergencyId}/cancel`, null);
    return response.data;
  },

  async submitTriage(emergencyId: number, request: EmergencyTriageRequest): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`${emergenciesPath}/${emergencyId}/triage`, request);
    return response.data;
  },
};
