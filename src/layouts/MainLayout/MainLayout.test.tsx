import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../app/providers/authContext';
import type { AuthUser } from '../../types/auth';
import { mantineTheme } from '../../styles/theme';
import { MainLayout } from './MainLayout';

const citizen: AuthUser = { type: 'CITIZEN', userId: 1, email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', role: 'USER' };
const staff: AuthUser = { type: 'STAFF', userId: null, role: 'STAFF', uid: 'staff-1', employeeNumber: 'E-1', fullName: 'Staff Demo', email: 'staff@citypass.com', module: 'movilidad', groups: ['admin'] };
const delegatedStaff: AuthUser = { ...staff, groups: ['delegados'] };
const staffWithoutAdministration: AuthUser = { ...staff, groups: ['operadores'] };

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
    expect(screen.getByText('Personal municipal')).toBeInTheDocument();
  });

  it('habilita la gestión para STAFF del grupo delegados', () => {
    renderLayout(delegatedStaff);
    expect(screen.getByText('Gestión')).toBeInTheDocument();
  });

  it('oculta la gestión para STAFF sin grupos administrativos', () => {
    renderLayout(staffWithoutAdministration);
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
  });
});
