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
it('consulta el endpoint y muestra el html aislado', async () => {
  await mount();
  const frame = await screen.findByTitle('Dashboard de Analítica de Movilidad');
  expect(frame).toHaveAttribute('srcdoc', '<html><body>BI</body></html>');
  expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
  expect(api.getEmbed).toHaveBeenCalledOnce();
});
it('muestra carga mientras espera la respuesta', async () => {
  let resolve!: (value: string) => void;
  api.getEmbed.mockReturnValue(new Promise<string>((done) => { resolve = done; }));
  await mount();
  expect(screen.getByText('Estamos consultando el tablero.')).toBeInTheDocument();
  resolve('<html>BI</html>');
  expect(await screen.findByTitle('Dashboard de Analítica de Movilidad')).toBeInTheDocument();
});
it('explica cuando el usuario no tiene permisos', async () => {
  api.getEmbed.mockRejectedValueOnce(Object.assign(new Error('forbidden'), {
    isAxiosError: true, response: { status: 403 },
  }));
  await mount();
  expect(await screen.findByText('Tu usuario no tiene permiso para consultar este tablero.')).toBeInTheDocument();
});
it('permite reintentar ante un error y carga el tablero', async () => {
  api.getEmbed.mockRejectedValueOnce(new Error('offline'));
  await mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByTitle('Dashboard de Analítica de Movilidad')).toBeInTheDocument();
  expect(api.getEmbed).toHaveBeenCalledTimes(2);
});