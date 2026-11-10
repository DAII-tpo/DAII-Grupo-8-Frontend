import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../app/providers/authContext';
import type { AuthUser } from '../../types/auth';
import { mantineTheme } from '../../styles/theme';
import { MainLayout } from './MainLayout';

const citizen: AuthUser = { type: 'CITIZEN', userId: 1, role: 'CITIZEN', email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', groups: [] };
const staff: AuthUser = { type: 'STAFF', userId: 12, role: 'ADMIN', email: 'staff@citypass.com', firstName: 'Staff', lastName: 'Demo', groups: ['admin'] };
const delegatedStaff: AuthUser = { ...staff, groups: ['delegados'] };
const staffWithoutAdministration: AuthUser = { ...staff, role: 'USER', groups: ['operadores'] };

function authValue(user: AuthUser): AuthContextValue {
  return { isAuthenticated: true, isRestoring: false, user, login: vi.fn(), loginCitizen: vi.fn(), registerCitizen: vi.fn(), loginStaff: vi.fn(), logout: vi.fn() };
}

function renderLayout(user: AuthUser) {
  return render(<MemoryRouter><MantineProvider theme={mantineTheme}><AuthContext.Provider value={authValue(user)}><MainLayout /></AuthContext.Provider></MantineProvider></MemoryRouter>);
}

afterEach(cleanup);

describe('MainLayout', () => {
  it('oculta gestión administrativa para CITIZEN', () => {
    renderLayout(citizen);
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.getByText('Ciudadano')).toBeInTheDocument();
  });

  it('muestra gestión administrativa para STAFF autorizado', () => {
    renderLayout(staff);
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  it('habilita la gestión para STAFF delegado con rol ADMIN', () => {
    renderLayout(delegatedStaff);
    expect(screen.getByText('Gestión')).toBeInTheDocument();
  });

  it('oculta la gestión para STAFF con rol USER', () => {
    renderLayout(staffWithoutAdministration);
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.getByText('Personal municipal')).toBeInTheDocument();
  });
});
