import { httpClient } from '../http/httpClient';
import type { CulturalDestination } from '../../types/culturalDestination';
import type { StationRecommendation } from '../../types/stationRecommendation';

const base = '/api/v1/destinations/events';

export const culturalDestinationService = {
  async upcoming(): Promise<CulturalDestination[]> {
    const { data } = await httpClient.get<CulturalDestination[]>(base);
    return data;
  },

  async recommendation(eventId: string): Promise<StationRecommendation> {
    const { data } = await httpClient.get<StationRecommendation>(
      `${base}/${encodeURIComponent(eventId)}/recommendation`,
    );
    return data;
  },
};
