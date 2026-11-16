import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ getEmbed: vi.fn() }));
vi.mock('../../services/analytics/analyticsService', () => ({ analyticsService: api }));
vi.mock('../../components/mobility/MobilityNavigation', () => ({ MobilityNavigation: () => null }));
afterEach(cleanup);
beforeEach(() => { vi.resetAllMocks(); api.getEmbed.mockResolvedValue('<html><body>BI</body></html>'); });
async function mount() {
  const { MobilityAnalyticsPage } = await import('./index');
  render(<MantineProvider><MemoryRouter initialEntries={['/movilidad/analitica']}><MobilityAnalyticsPage /></MemoryRouter></MantineProvider>);
}
it('consulta el endpoint autenticado y muestra el html aislado', async () => {
  await mount();
  expect(await screen.findByTitle('Dashboard de Analítica de Movilidad')).toHaveAttribute('srcdoc', '<html><body>BI</body></html>');
  expect(screen.getByTitle('Dashboard de Analítica de Movilidad')).toHaveAttribute('sandbox', 'allow-scripts');
  expect(api.getEmbed).toHaveBeenCalledOnce();
});
it('muestra error y permite reintentar', async () => {
  api.getEmbed.mockRejectedValueOnce(new Error('offline'));
  await mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByTitle('Dashboard de Analítica de Movilidad')).toBeInTheDocument();
  expect(api.getEmbed).toHaveBeenCalledTimes(2);
});