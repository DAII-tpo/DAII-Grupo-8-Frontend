import { beforeEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('../http/httpClient', () => ({ httpClient: { get } }));
import { analyticsService } from './analyticsService';
beforeEach(() => vi.resetAllMocks());
it('solicita el HTML al endpoint autenticado con Accept text/html', async () => {
  get.mockResolvedValue({ data: '<html>BI</html>' });
  await expect(analyticsService.getEmbed()).resolves.toBe('<html>BI</html>');
  expect(get).toHaveBeenCalledWith('/api/v1/admin/analytics/embed', {
    responseType: 'text', headers: { Accept: 'text/html' },
  });
});