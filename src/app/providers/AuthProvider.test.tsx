import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authStorageKey } from '../../services/auth/authStorage';
import { authService } from '../../services/auth/authService';
import type { AuthSession, CitizenAuthResponse, FederatedTokenResponse, FederatedUserInfo } from '../../types/auth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

vi.mock('../../services/auth/authService', () => ({
  authService: {
    citizenLogin: vi.fn(),
    citizenRefresh: vi.fn(),
    citizenRegister: vi.fn(),
    staffLogin: vi.fn(),
    staffRefresh: vi.fn(),
    staffMe: vi.fn(),
    staffLogout: vi.fn(),
  },
}));

const citizenResponse: CitizenAuthResponse = {
  accessToken: 'citizen-access', refreshToken: 'citizen-refresh', expiresIn: 3600, tokenType: 'Bearer',
  userId: 1, email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', role: 'USER',
};
const staffTokens: FederatedTokenResponse = {
  access_token: 'staff-access', refresh_token: 'staff-refresh', expires_in: 3600, token_type: 'Bearer',
};
const staffProfile: FederatedUserInfo = {
  uid: 'staff-1', employeeNumber: 'E-1', fullName: 'Staff Demo', email: 'staff@citypass.com', module: 'movilidad', groups: ['admin'],
};

function citizenSession(expiresAt = Date.now() + 3_600_000): AuthSession {
  return { accessToken: 'old-citizen-access', refreshToken: 'old-citizen-refresh', expiresAt, user: { type: 'CITIZEN', userId: 1, email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', role: 'USER' } };
}

function staffSession(expiresAt = Date.now() + 3_600_000): AuthSession {
  return { accessToken: 'old-staff-access', refreshToken: 'old-staff-refresh', expiresAt, user: { type: 'STAFF', userId: null, role: 'STAFF', ...staffProfile } };
}

function AuthHarness() {
  const { isAuthenticated, isRestoring, loginCitizen, loginStaff, logout, user } = useAuth();
  const run = (action: () => Promise<void>) => { action().catch(() => undefined); };
  return <>
    <output data-testid="session">{user ? `${user.type}:${user.email}` : 'none'}</output>
    <output data-testid="authenticated">{String(isAuthenticated)}</output>
    <output data-testid="restoring">{String(isRestoring)}</output>
    <button onClick={() => run(() => loginCitizen('citizen@citypass.com', 'secret'))}>Login citizen</button>
    <button onClick={() => run(() => loginStaff('staff', 'secret'))}>Login staff</button>
    <button onClick={() => run(logout)}>Logout</button>
  </>;
}

function renderAuth() { return render(<AuthProvider><AuthHarness /></AuthProvider>); }

beforeEach(() => {
  vi.mocked(authService.citizenLogin).mockResolvedValue(citizenResponse);
  vi.mocked(authService.staffLogin).mockResolvedValue(staffTokens);
  vi.mocked(authService.staffMe).mockResolvedValue(staffProfile);
  vi.mocked(authService.citizenRefresh).mockResolvedValue({ ...citizenResponse, accessToken: 'new-citizen-access', refreshToken: 'new-citizen-refresh' });
  vi.mocked(authService.staffRefresh).mockResolvedValue({ ...staffTokens, access_token: 'new-staff-access', refresh_token: 'new-staff-refresh' });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); });

describe('AuthProvider', () => {
  it('persiste una sesión CITIZEN tras el login', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login citizen' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('CITIZEN:citizen@citypass.com'));
    expect(JSON.parse(window.localStorage.getItem(authStorageKey) ?? '{}')).toMatchObject({ accessToken: 'citizen-access', refreshToken: 'citizen-refresh', user: { type: 'CITIZEN' } });
  });

  it('persiste una sesión STAFF tras login y perfil federado', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login staff' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('STAFF:staff@citypass.com'));
    expect(authService.staffMe).toHaveBeenCalledWith('staff-access');
    expect(JSON.parse(window.localStorage.getItem(authStorageKey) ?? '{}')).toMatchObject({ accessToken: 'staff-access', refreshToken: 'staff-refresh', user: { type: 'STAFF' } });
  });

  it('no inicia sesión STAFF si el perfil pertenece a otro módulo', async () => {
    vi.mocked(authService.staffMe).mockResolvedValueOnce({ ...staffProfile, module: 'cultura' });
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login staff' }));
    await waitFor(() => expect(authService.staffMe).toHaveBeenCalledWith('staff-access'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });

  it('restaura una sesión válida persistida', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession()));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('CITIZEN:citizen@citypass.com');
  });

  it('consulta /me una sola vez al restaurar una sesión STAFF', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(staffSession()));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(authService.staffMe).toHaveBeenCalledOnce();
  });

  it('renueva y rota tokens de una sesión CITIZEN expirada', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(authService.citizenRefresh).toHaveBeenCalledWith('old-citizen-refresh'));
    expect(JSON.parse(window.localStorage.getItem(authStorageKey) ?? '{}')).toMatchObject({ accessToken: 'new-citizen-access', refreshToken: 'new-citizen-refresh' });
  });

  it('renueva y rota tokens de una sesión STAFF expirada', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(staffSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(authService.staffRefresh).toHaveBeenCalledWith('old-staff-refresh'));
    expect(JSON.parse(window.localStorage.getItem(authStorageKey) ?? '{}')).toMatchObject({ accessToken: 'new-staff-access', refreshToken: 'new-staff-refresh' });
  });

  it('limpia la sesión si falla el refresh durante la restauración', async () => {
    vi.mocked(authService.citizenRefresh).mockRejectedValueOnce(new Error('expired'));
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });

  it('limpia la sesión local y cierra STAFF de forma best-effort', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login staff' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('STAFF:staff@citypass.com'));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('none'));
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(authService.staffLogout).toHaveBeenCalledWith('staff-refresh');
  });

  it('limpia la sesión CITIZEN al cerrar sesión sin llamar al IdP', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login citizen' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('CITIZEN:citizen@citypass.com'));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('none'));
    expect(authService.staffLogout).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });
});
