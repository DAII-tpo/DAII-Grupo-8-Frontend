import { httpClient } from '../http/httpClient';
const embedPath = '/api/v1/admin/analytics/embed';
export const analyticsService = {
  async getEmbed(): Promise<string> {
    const response = await httpClient.get<string>(embedPath, { responseType: 'text', headers: { Accept: 'text/html' } });
    return response.data;
  },
};