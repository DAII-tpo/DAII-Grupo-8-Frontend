import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../app/providers/authContext';
import { RequireAuth } from '../../app/router/RequireAuth';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { AuthUser } from '../../types/auth';
import { MobilityAnalyticsPage } from './index';

vi.mock('../../services/analytics/analyticsService', () => ({ analyticsService: { embed: vi.fn() } }));
const admin: AuthUser = { type: 'STAFF', role: 'ADMIN', userId: 1, email: '', firstName: '', lastName: '', groups: ['admin'] };
function app(user: AuthUser | null, isRestoring = false) {
  const auth: AuthContextValue = { user, isAuthenticated: user !== null, isRestoring, login: vi.fn(), loginCitizen: vi.fn(),
    registerCitizen: vi.fn(), loginStaff: vi.fn(), logout: vi.fn() };
  return <AuthContext.Provider value={auth}><MantineProvider><MemoryRouter initialEntries={['/movilidad/analitica']}><Routes>
    <Route path="/login" element={<div>Iniciar sesión</div>} />
    <Route path="/movilidad" element={<div>Movilidad</div>} />
    <Route path="/movilidad/analitica" element={<RequireAuth><MobilityAnalyticsPage /></RequireAuth>} />
  </Routes></MemoryRouter></MantineProvider></AuthContext.Provider>;
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(analyticsService.embed).mockResolvedValue({ status: 'connected' }); });
afterEach(cleanup);
it('no pide el tablero mientras se restaura la identidad', () => {
  render(app(admin, true));
  expect(analyticsService.embed).not.toHaveBeenCalled();
  expect(document.querySelector('iframe')).toBeNull();
});
it('una visita anónima se redirige al login sin consultar BI', async () => {
  render(app(null));
  expect(await screen.findByText('Iniciar sesión')).toBeInTheDocument();
  expect(analyticsService.embed).not.toHaveBeenCalled();
});
it('el administrador autenticado llega a la pantalla protegida', async () => {
  render(app(admin));
  expect(await screen.findByText('Conexión con Analítica establecida')).toBeInTheDocument();
});
it('al finalizar la sesión se elimina el HTML protegido', async () => {
  vi.mocked(analyticsService.embed).mockResolvedValue({ status: 'ready', html: '<html><body>BI</body></html>' });
  const view = render(app(admin));
  await screen.findByTitle('Tablero de Analítica de Movilidad');
  view.rerender(app(null));
  expect(await screen.findByText('Iniciar sesión')).toBeInTheDocument();
  expect(document.querySelector('iframe')).toBeNull();
});
