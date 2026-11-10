import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const config = vi.hoisted(() => ({ analyticsEmbedUrl: '', analyticsDashboards: '' }));
vi.mock('../../config/env', () => ({ env: config }));
vi.mock('../../components/mobility/MobilityNavigation', () => ({ MobilityNavigation: () => null }));
afterEach(cleanup);
beforeEach(() => { vi.resetModules(); config.analyticsEmbedUrl = ''; config.analyticsDashboards = ''; });
function Location() { return <output data-testid="query">{useLocation().search}</output>; }
async function mount(query = '') {
  const { MobilityAnalyticsPage } = await import('./index');
  render(<MantineProvider><MemoryRouter initialEntries={['/movilidad/analitica' + query]}>
    <MobilityAnalyticsPage /><Location />
  </MemoryRouter></MantineProvider>);
}
it('explica que BI todavía no entregó dashboards', async () => {
  await mount(); expect(screen.getByText('Esperando los dashboards de BI')).toBeInTheDocument();
});
it('informa configuración inválida', async () => {
  config.analyticsDashboards = '{'; await mount();
  expect(screen.getByText('VITE_ANALYTICS_DASHBOARDS no contiene JSON válido.')).toBeInTheDocument();
});
it('embebe el tablero general y ofrece un enlace seguro', async () => {
  config.analyticsEmbedUrl = 'https://bi.example/general'; await mount();
  expect(screen.getByTitle('Dashboard BI: Vista general')).toHaveAttribute('src', config.analyticsEmbedUrl);
  expect(screen.getByRole('link')).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
});
it('selecciona por URL y conserva otros parámetros al cambiar de tablero', async () => {
  config.analyticsDashboards = JSON.stringify([
    { id: 'uno', title: 'Viajes', url: 'https://bi.example/uno', description: 'Resumen de viajes' },
    { id: 'dos', title: 'Incidentes', url: 'https://bi.example/dos' },
  ]);
  await mount('?dashboard=dos&view=compact');
  expect(screen.getByTitle('Dashboard BI: Incidentes')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('combobox', { name: 'Seleccionar dashboard' }));
  fireEvent.click(await screen.findByRole('option', { name: 'Viajes' }));
  expect(screen.getByTitle('Dashboard BI: Viajes')).toHaveAttribute('src', 'https://bi.example/uno');
  expect(screen.getByText('Resumen de viajes')).toBeInTheDocument();
  expect(screen.getByTestId('query')).toHaveTextContent('dashboard=uno&view=compact');
});
it('un dashboard desconocido usa el primero del catálogo', async () => {
  config.analyticsEmbedUrl = 'https://bi.example/general'; await mount('?dashboard=missing');
  expect(screen.getByTitle('Dashboard BI: Vista general')).toBeInTheDocument();
});
