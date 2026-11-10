import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../../types/auth';
import { AuthContext, type AuthContextValue } from '../providers/authContext';
import { RequireRole } from './RequireRole';

const citizen: AuthUser = { type: 'CITIZEN', userId: 1, role: 'CITIZEN', email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', groups: [] };
const staff: AuthUser = { type: 'STAFF', userId: 12, role: 'ADMIN', email: 'staff@citypass.com', firstName: 'Staff', lastName: 'Demo', groups: ['admin'] };
const delegatedStaff: AuthUser = { ...staff, groups: ['delegados'] };
const staffWithoutAdministration: AuthUser = { ...staff, role: 'USER', groups: ['operadores'] };

function authValue(user: AuthUser): AuthContextValue {
  return { isAuthenticated: true, isRestoring: false, user, login: vi.fn(), loginCitizen: vi.fn(), registerCitizen: vi.fn(), loginStaff: vi.fn(), logout: vi.fn() };
}

function renderRoute(user: AuthUser) {
  return render(<MemoryRouter initialEntries={['/movilidad/administracion']}><AuthContext.Provider value={authValue(user)}><Routes>
    <Route path="/movilidad" element={<div>Movilidad</div>} />
    <Route path="/movilidad/administracion" element={<RequireRole><div>Administración</div></RequireRole>} />
  </Routes></AuthContext.Provider></MemoryRouter>);
}

afterEach(cleanup);

describe('RequireRole', () => {
  it('decide por role y no por los grupos', () => {
    renderRoute({ ...staffWithoutAdministration, groups: ['admin'] });
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  it('redirige CITIZEN desde administración', () => {
    renderRoute(citizen);
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  it('permite a role ADMIN renderizar administración', () => {
    renderRoute(staff);
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('permite a STAFF delegado con role ADMIN renderizar administración', () => {
    renderRoute(delegatedStaff);
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('redirige STAFF con role USER (sin grupo admin)', () => {
    renderRoute(staffWithoutAdministration);
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });
});
