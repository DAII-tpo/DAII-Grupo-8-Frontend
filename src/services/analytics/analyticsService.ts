import { httpClient } from '../http/httpClient';

export type AnalyticsEmbed = { status: 'connected' } | { status: 'ready'; html: string };

/** Solo usa el backend de Movilidad. El token de servicio permanece en Render. */
export const analyticsService = {
  async embed(signal?: AbortSignal): Promise<AnalyticsEmbed> {
    const { data, headers } = await httpClient.get<string>('/api/v1/admin/analytics/embed', {
      signal,
      responseType: 'text',
      transformResponse: [(body: string) => body],
      headers: { Accept: 'text/html, application/json', 'Cache-Control': 'no-store' },
    });
    const type = String(headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
    if (type === 'application/json') {
      const result: unknown = JSON.parse(data);
      if (result && typeof result === 'object' && 'status' in result && result.status === 'ok') {
        return { status: 'connected' };
      }
    }
    if (type === 'text/html' && /<html(?:\s|>)/i.test(data)) return { status: 'ready', html: data };
    throw new Error('Analítica todavía no entregó un tablero compatible.');
  },
};
