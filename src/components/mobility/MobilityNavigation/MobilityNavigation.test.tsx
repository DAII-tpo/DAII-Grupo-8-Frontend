import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { AuthContext, type AuthContextValue } from '../../../app/providers/authContext';
import type { AuthUser } from '../../../types/auth';
import { MobilityNavigation } from './MobilityNavigation';

afterEach(cleanup);
function mount(role: 'ADMIN' | 'USER' | 'CITIZEN') {
  const user: AuthUser = { type: role === 'CITIZEN' ? 'CITIZEN' : 'STAFF', role, userId: 1, firstName: '', lastName: '', email: '', groups: [] };
  const auth: AuthContextValue = { user, isAuthenticated: true, isRestoring: false, login: vi.fn(), loginStaff: vi.fn(),
    loginCitizen: vi.fn(), registerCitizen: vi.fn(), logout: vi.fn() };
  render(<AuthContext.Provider value={auth}><MantineProvider><MemoryRouter><MobilityNavigation /></MemoryRouter></MantineProvider></AuthContext.Provider>);
}
it('muestra Analítica al administrador', () => {
  mount('ADMIN'); expect(screen.getByRole('tab', { name: 'Analítica' })).toBeInTheDocument();
});
it.each(['USER', 'CITIZEN'] as const)('oculta Analítica a %s y mantiene Eventos', (role) => {
  mount(role);
  expect(screen.queryByRole('tab', { name: 'Analítica' })).not.toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Eventos' })).toBeInTheDocument();
});
