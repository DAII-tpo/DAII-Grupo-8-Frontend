import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../../components/mobility/MobilityNavigation', () => ({ MobilityNavigation: () => null }));
afterEach(cleanup);
function Destination() { const location = useLocation(); return <output data-testid="destination">{location.pathname}{location.search}</output>; }
it('redirige la ruta anterior a la analítica de administración', async () => {
  const { MobilityAnalyticsPage } = await import('./index');
  render(<MantineProvider><MemoryRouter initialEntries={['/movilidad/analitica']}><Routes>
    <Route path="/movilidad/analitica" element={<MobilityAnalyticsPage />} />
    <Route path="/movilidad/administracion" element={<Destination />} />
  </Routes></MemoryRouter></MantineProvider>);
  expect(await screen.findByTestId('destination')).toHaveTextContent('/movilidad/administracion?tab=analytics');
});