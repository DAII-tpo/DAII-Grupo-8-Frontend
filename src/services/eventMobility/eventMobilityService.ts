import { httpClient } from '../http/httpClient';
import type { CulturalDestination, EventArrivalIntent, EventMobilityDecision, EventMobilityDecisionRequest } from '../../types/eventMobility';

const path = '/api/v1/destinations/events';
export const eventMobilityService = {
  async upcoming(): Promise<CulturalDestination[]> {
    return (await httpClient.get<CulturalDestination[]>(path)).data;
  },
  async decide(eventId: string, request: EventMobilityDecisionRequest): Promise<EventMobilityDecision> {
    return (await httpClient.post<EventMobilityDecision>(`${path}/${eventId}/mobility-decision`, request)).data;
  },
  async getArrivalIntent(eventId: string): Promise<EventArrivalIntent | null> {
    return (await httpClient.get<EventArrivalIntent | null>(`${path}/${encodeURIComponent(eventId)}/arrival-intention`)).data;
  },
  async registerArrivalIntent(eventId: string, stationId: number, arrivalAt: string): Promise<EventArrivalIntent> {
    return (await httpClient.put<EventArrivalIntent>(`${path}/${encodeURIComponent(eventId)}/arrival-intention`, { stationId, arrivalAt })).data;
  },
  async cancelArrivalIntent(eventId: string): Promise<void> {
    await httpClient.delete(`${path}/${encodeURIComponent(eventId)}/arrival-intention`);
  },
};
