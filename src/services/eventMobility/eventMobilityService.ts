import { httpClient } from '../http/httpClient';
import type { CulturalDestination, EventArrivalIntent, EventMobilityDecision, EventMobilityDecisionRequest } from '../../types/eventMobility';

const path = '/api/v1/destinations/events';
const EVENTS_CACHE_MS = 30_000;
let eventsCache: { data: CulturalDestination[]; expiresAt: number } | null = null;
let eventsRequest: Promise<CulturalDestination[]> | null = null;
let eventsRequestId = 0;

export const eventMobilityService = {
  async upcoming(force = false): Promise<CulturalDestination[]> {
    if (!force && eventsCache && eventsCache.expiresAt > Date.now()) return eventsCache.data;
    if (!force && eventsRequest) return eventsRequest;
    const requestId = ++eventsRequestId;
    const request = httpClient.get<CulturalDestination[]>(path).then(({ data }) => {
      if (requestId === eventsRequestId) eventsCache = { data, expiresAt: Date.now() + EVENTS_CACHE_MS };
      return data;
    });
    eventsRequest = request.finally(() => {
      if (requestId === eventsRequestId) eventsRequest = null;
    });
    return eventsRequest;
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
