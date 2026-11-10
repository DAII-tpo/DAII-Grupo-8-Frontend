import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authStorageKey } from '../../services/auth/authStorage';
import { authService } from '../../services/auth/authService';
import type { AuthSession, CitizenAuthResponse, CurrentUserResponse, FederatedTokenResponse } from '../../types/auth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

vi.mock('../../services/auth/authService', () => ({
  authService: {
    citizenLogin: vi.fn(),
    citizenRefresh: vi.fn(),
    citizenRegister: vi.fn(),
    staffLogin: vi.fn(),
    staffRefresh: vi.fn(),
    currentUser: vi.fn(),
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
const citizenMe: CurrentUserResponse = {
  id: 1, type: 'CITIZEN', role: 'CITIZEN', firstName: 'Ana', lastName: 'Pérez', email: 'citizen@citypass.com', groups: [],
};
const staffMe: CurrentUserResponse = {
  id: 12, type: 'STAFF', role: 'ADMIN', firstName: 'Staff', lastName: 'Demo', email: 'staff@citypass.com', groups: ['admin'],
};

function citizenSession(expiresAt = Date.now() + 3_600_000): AuthSession {
  return { accessToken: 'old-citizen-access', refreshToken: 'old-citizen-refresh', expiresAt, user: { type: 'CITIZEN', userId: 1, role: 'CITIZEN', email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', groups: [] } };
}

/** Sesión STAFF guardada con rol USER: la restauración tiene que traer el rol actual del backend. */
function staffSession(expiresAt = Date.now() + 3_600_000): AuthSession {
  return { accessToken: 'old-staff-access', refreshToken: 'old-staff-refresh', expiresAt, user: { type: 'STAFF', userId: 12, role: 'USER', email: 'staff@citypass.com', firstName: 'Staff', lastName: 'Demo', groups: [] } };
}

function storedSession(): AuthSession {
  return JSON.parse(window.localStorage.getItem(authStorageKey) ?? '{}') as AuthSession;
}

function AuthHarness() {
  const { isAuthenticated, isRestoring, loginCitizen, loginStaff, logout, user } = useAuth();
  const run = (action: () => Promise<void>) => { action().catch(() => undefined); };
  return <>
    <output data-testid="session">{user ? `${user.type}:${user.email}` : 'none'}</output>
    <output data-testid="role">{user ? `${user.role}:${user.userId}` : 'none'}</output>
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
  vi.mocked(authService.currentUser).mockImplementation(async (accessToken: string) => (accessToken.includes('staff') ? staffMe : citizenMe));
  vi.mocked(authService.citizenRefresh).mockResolvedValue({ ...citizenResponse, accessToken: 'new-citizen-access', refreshToken: 'new-citizen-refresh' });
  vi.mocked(authService.staffRefresh).mockResolvedValue({ ...staffTokens, access_token: 'new-staff-access', refresh_token: 'new-staff-refresh' });
});

afterEach(() => { cleanup(); vi.clearAllMocks(); window.localStorage.clear(); });

describe('AuthProvider', () => {
  it('persiste una sesión CITIZEN con el rol y el id de /api/v1/users/me', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login citizen' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('CITIZEN:citizen@citypass.com'));
    expect(authService.currentUser).toHaveBeenCalledWith('citizen-access');
    expect(screen.getByTestId('role')).toHaveTextContent('CITIZEN:1');
    expect(storedSession()).toMatchObject({ accessToken: 'citizen-access', refreshToken: 'citizen-refresh', user: { type: 'CITIZEN', role: 'CITIZEN', userId: 1 } });
  });

  it('persiste una sesión STAFF con el rol y el id de /api/v1/users/me', async () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login staff' }));
    await waitFor(() => expect(screen.getByTestId('session')).toHaveTextContent('STAFF:staff@citypass.com'));
    expect(authService.currentUser).toHaveBeenCalledWith('staff-access');
    expect(screen.getByTestId('role')).toHaveTextContent('ADMIN:12');
    expect(storedSession()).toMatchObject({ accessToken: 'staff-access', refreshToken: 'staff-refresh', user: { type: 'STAFF', role: 'ADMIN', userId: 12, groups: ['admin'] } });
  });

  it('no inicia sesión si el backend rechaza /api/v1/users/me', async () => {
    vi.mocked(authService.currentUser).mockRejectedValueOnce(new Error('401'));
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login staff' }));
    await waitFor(() => expect(authService.currentUser).toHaveBeenCalledWith('staff-access'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });

  it('restaura una sesión válida persistida consultando /users/me una vez', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession()));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('CITIZEN:citizen@citypass.com');
    expect(authService.currentUser).toHaveBeenCalledOnce();
    expect(authService.currentUser).toHaveBeenCalledWith('old-citizen-access');
  });

  it('consulta /users/me una sola vez al restaurar y actualiza el rol STAFF', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(staffSession()));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('role')).toHaveTextContent('ADMIN:12'));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(authService.currentUser).toHaveBeenCalledOnce();
    expect(authService.currentUser).toHaveBeenCalledWith('old-staff-access');
    expect(storedSession().user).toMatchObject({ role: 'ADMIN', userId: 12 });
  });

  it('descarta una sesión guardada con el formato viejo', async () => {
    const legacy = { accessToken: 'legacy', refreshToken: 'legacy-refresh', expiresAt: Date.now() + 3_600_000, user: { type: 'STAFF', userId: null, role: 'STAFF', uid: 'staff-1', employeeNumber: 'E-1', fullName: 'Staff Demo', email: 'staff@citypass.com', module: 'movilidad', groups: ['admin'] } };
    window.localStorage.setItem(authStorageKey, JSON.stringify(legacy));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(authService.currentUser).not.toHaveBeenCalled();
  });

  it('renueva y rota tokens de una sesión CITIZEN expirada', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(authService.citizenRefresh).toHaveBeenCalledWith('old-citizen-refresh');
    expect(authService.currentUser).toHaveBeenCalledOnce();
    expect(authService.currentUser).toHaveBeenCalledWith('new-citizen-access');
    expect(storedSession()).toMatchObject({ accessToken: 'new-citizen-access', refreshToken: 'new-citizen-refresh', user: { role: 'CITIZEN', userId: 1 } });
  });

  it('renueva y rota tokens de una sesión STAFF expirada', async () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(staffSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(authService.staffRefresh).toHaveBeenCalledWith('old-staff-refresh');
    expect(authService.currentUser).toHaveBeenCalledWith('new-staff-access');
    expect(storedSession()).toMatchObject({ accessToken: 'new-staff-access', refreshToken: 'new-staff-refresh', user: { role: 'ADMIN', userId: 12 } });
  });

  it('limpia la sesión si falla el refresh durante la restauración', async () => {
    vi.mocked(authService.citizenRefresh).mockRejectedValueOnce(new Error('expired'));
    window.localStorage.setItem(authStorageKey, JSON.stringify(citizenSession(Date.now() - 1)));
    renderAuth();
    await waitFor(() => expect(screen.getByTestId('restoring')).toHaveTextContent('false'));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
    expect(authService.currentUser).not.toHaveBeenCalled();
  });

  it('limpia la sesión si /users/me falla durante la restauración', async () => {
    vi.mocked(authService.currentUser).mockRejectedValueOnce(new Error('401'));
    window.localStorage.setItem(authStorageKey, JSON.stringify(staffSession()));
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
