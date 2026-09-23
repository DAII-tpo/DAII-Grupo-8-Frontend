import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { authStorageKey } from '../../config/demoAuth';
import { AuthProvider } from './AuthProvider';
import { useAuth } from './authContext';

function AuthHarness() {
  const { isAuthenticated, login, logout, user } = useAuth();
  return <>
    <output data-testid="session">{user ? `${user.email}:${user.role}:${user.userId}` : 'none'}</output>
    <output data-testid="authenticated">{String(isAuthenticated)}</output>
    <button onClick={() => login('user@citypass.com', 'citypass123')}>Login user</button>
    <button onClick={() => login('admin@citypass.com', 'citypass123')}>Login admin</button>
    <button onClick={() => login('user@citypass.com', 'wrong')}>Login invalid</button>
    <button onClick={logout}>Logout</button>
  </>;
}

function renderAuth() { return render(<AuthProvider><AuthHarness /></AuthProvider>); }

afterEach(() => { cleanup(); window.localStorage.clear(); });

describe('AuthProvider', () => {
  it('autentica los perfiles USER y ADMIN con credenciales explícitas', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login user' }));
    expect(screen.getByTestId('session')).toHaveTextContent('user@citypass.com:USER:1');
    fireEvent.click(screen.getByRole('button', { name: 'Login admin' }));
    expect(screen.getByTestId('session')).toHaveTextContent('admin@citypass.com:ADMIN:2');
  });

  it('rechaza credenciales inválidas y persiste una sesión válida tras remount', () => {
    const { unmount } = renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login invalid' }));
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    fireEvent.click(screen.getByRole('button', { name: 'Login admin' }));
    unmount();
    renderAuth();
    expect(screen.getByTestId('session')).toHaveTextContent('admin@citypass.com:ADMIN:2');
  });

  it('restaura de forma independiente las sesiones USER y ADMIN', () => {
    window.localStorage.setItem(authStorageKey, JSON.stringify({ email: 'user@citypass.com', role: 'USER', userId: 1 }));
    const { unmount } = renderAuth();
    expect(screen.getByTestId('session')).toHaveTextContent('user@citypass.com:USER:1');
    unmount();
    window.localStorage.setItem(authStorageKey, JSON.stringify({ email: 'admin@citypass.com', role: 'ADMIN', userId: 2 }));
    renderAuth();
    expect(screen.getByTestId('session')).toHaveTextContent('admin@citypass.com:ADMIN:2');
  });

  it.each([
    { email: 'x@x.com', role: 'ADMIN', userId: 2 },
    { email: 'user@citypass.com', role: 'ADMIN', userId: 1 },
    { email: 'admin@citypass.com', role: 'USER', userId: 2 },
    { email: 'admin@citypass.com', role: 'ADMIN', userId: 1 },
  ])('ignora y elimina sesiones almacenadas inválidas: $email', (storedUser) => {
    window.localStorage.setItem(authStorageKey, JSON.stringify(storedUser));
    renderAuth();
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });

  it('limpia la sesión al cerrar sesión', () => {
    renderAuth();
    fireEvent.click(screen.getByRole('button', { name: 'Login user' }));
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(window.localStorage.getItem(authStorageKey)).toBeNull();
  });
});
