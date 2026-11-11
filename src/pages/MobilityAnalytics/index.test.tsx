import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../app/providers/authContext';
import { analyticsService } from '../../services/analytics/analyticsService';
import type { AuthUser } from '../../types/auth';
import { MobilityAnalyticsPage } from './index';

vi.mock('../../services/analytics/analyticsService', () => ({ analyticsService: { embed: vi.fn() } }));
const admin: AuthUser = { type: 'STAFF', role: 'ADMIN', userId: 1, email: '', firstName: 'Ana', lastName: '', groups: ['admin'] };
const citizen: AuthUser = { ...admin, type: 'CITIZEN', role: 'CITIZEN', groups: [] };
const html = '<!doctype html><meta http-equiv="Content-Security-Policy" content="connect-src \'none\'"><html><body>Tablero real de BI</body></html>';

function app(user: AuthUser) {
  const auth: AuthContextValue = { user, isAuthenticated: true, isRestoring: false, login: vi.fn(), loginCitizen: vi.fn(),
    loginStaff: vi.fn(), registerCitizen: vi.fn(), logout: vi.fn() };
  return <AuthContext.Provider value={auth}><MantineProvider><MemoryRouter initialEntries={['/movilidad/analitica']}><Routes>
    <Route path="/movilidad/analitica" element={<MobilityAnalyticsPage />} />
    <Route path="/movilidad" element={<div>Inicio de Movilidad</div>} />
  </Routes></MemoryRouter></MantineProvider></AuthContext.Provider>;
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(analyticsService.embed).mockResolvedValue({ status: 'connected' }); });
afterEach(cleanup);

it('solo el administrador consulta Analítica y muestra la confirmación sin iframe', async () => {
  render(app(admin));
  expect(await screen.findByText('Conexión con Analítica establecida')).toBeInTheDocument();
  expect(screen.getByText('El tablero estará disponible cuando el equipo de BI publique el HTML.')).toBeInTheDocument();
  expect(document.querySelector('iframe')).toBeNull();
  expect(analyticsService.embed).toHaveBeenCalledWith(expect.any(AbortSignal));
});
it('el ciudadano se redirige sin pedir HTML protegido', async () => {
  render(app(citizen));
  expect(await screen.findByText('Inicio de Movilidad')).toBeInTheDocument();
  expect(analyticsService.embed).not.toHaveBeenCalled();
});
it('un empleado sin rol administrativo tampoco accede', async () => {
  render(app({ ...admin, role: 'USER' }));
  expect(await screen.findByText('Inicio de Movilidad')).toBeInTheDocument();
  expect(analyticsService.embed).not.toHaveBeenCalled();
});
it('informa la carga mientras espera al backend', () => {
  vi.mocked(analyticsService.embed).mockReturnValue(new Promise(() => undefined));
  render(app(admin));
  expect(screen.getByText('Consultando Analítica…')).toBeInTheDocument();
});
it('presenta HTML mediante srcDoc y sandbox sin acceso al origen de la sesión', async () => {
  vi.mocked(analyticsService.embed).mockResolvedValue({ status: 'ready', html });
  render(app(admin));
  const frame = await screen.findByTitle('Tablero de Analítica de Movilidad');
  expect(frame).toHaveAttribute('srcdoc', html);
  expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
  expect(frame).not.toHaveAttribute('src');
  expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
  expect(window.localStorage.length).toBe(0);
});
it('permite reintentar un fallo de red sin inventar un dashboard', async () => {
  vi.mocked(analyticsService.embed).mockRejectedValueOnce(new Error('network'));
  render(app(admin));
  expect(await screen.findByText('Analítica no disponible')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar tablero' }));
  expect(await screen.findByText('Conexión con Analítica establecida')).toBeInTheDocument();
});
it('al perder el rol se retira el documento sensible y se cancela la petición', async () => {
  vi.mocked(analyticsService.embed).mockResolvedValue({ status: 'ready', html });
  const view = render(app(admin));
  await screen.findByTitle('Tablero de Analítica de Movilidad');
  const signal = vi.mocked(analyticsService.embed).mock.calls[0][0];
  view.rerender(app(citizen));
  expect(await screen.findByText('Inicio de Movilidad')).toBeInTheDocument();
  expect(document.querySelector('iframe')).toBeNull();
  expect(signal?.aborted).toBe(true);
});
it('actualizar descarta el HTML anterior mientras se solicita una versión nueva', async () => {
  vi.mocked(analyticsService.embed).mockResolvedValueOnce({ status: 'ready', html });
  render(app(admin));
  await screen.findByTitle('Tablero de Analítica de Movilidad');
  vi.mocked(analyticsService.embed).mockReturnValueOnce(new Promise(() => undefined));
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar tablero' }));
  expect(document.querySelector('iframe')).toBeNull();
  expect(screen.getByText('Consultando Analítica…')).toBeInTheDocument();
});
it('no restaura un HTML que llega después de perder el permiso', async () => {
  let complete!: (value: { status: 'ready'; html: string }) => void;
  vi.mocked(analyticsService.embed).mockReturnValue(new Promise((resolve) => { complete = resolve; }));
  const view = render(app(admin));
  view.rerender(app(citizen));
  await act(async () => { complete({ status: 'ready', html }); });
  expect(document.querySelector('iframe')).toBeNull();
  expect(screen.getByText('Inicio de Movilidad')).toBeInTheDocument();
});
it('descarta errores tardíos de una petición cancelada al salir', async () => {
  let fail!: (error: Error) => void;
  vi.mocked(analyticsService.embed).mockReturnValue(new Promise((_, reject) => { fail = reject; }));
  const view = render(app(admin));
  view.unmount();
  await act(async () => { fail(new Error('late network')); });
  expect(document.querySelector('iframe')).toBeNull();
});
