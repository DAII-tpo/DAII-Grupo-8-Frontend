import type {
  EmergencyCreateRequest,
  EmergencyResponse,
  EmergencyTriageRequest,
} from '../../types/emergency';
import { httpClient } from '../http/httpClient';
import { userHeaders } from '../http/userHeaders';

const emergenciesPath = '/api/v1/emergencies';

export const emergencyService = {
  /** Pide ayuda durante el viaje: lo pausa y bloquea la bici. Emergencias se entera después del cuestionario. */
  async report(userId: number, tripId: number, request: EmergencyCreateRequest): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`/api/v1/trips/${tripId}/emergencies`, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async getCurrent(userId: number): Promise<EmergencyResponse | null> {
    const response = await httpClient.get<EmergencyResponse>(`${emergenciesPath}/current`, {
      headers: userHeaders(userId),
    });
    return response.status === 204 ? null : response.data;
  },

  async cancel(userId: number, emergencyId: number): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`${emergenciesPath}/${emergencyId}/cancel`, null, {
      headers: userHeaders(userId),
    });
    return response.data;
  },

  async submitTriage(userId: number, emergencyId: number, request: EmergencyTriageRequest): Promise<EmergencyResponse> {
    const response = await httpClient.post<EmergencyResponse>(`${emergenciesPath}/${emergencyId}/triage`, request, {
      headers: userHeaders(userId),
    });
    return response.data;
  },
};
