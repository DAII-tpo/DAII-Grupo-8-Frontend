import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthUser } from '../../types/auth';
import { AuthContext, type AuthContextValue } from '../providers/authContext';
import { RequireRole } from './RequireRole';

const citizen: AuthUser = { type: 'CITIZEN', userId: 1, email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', role: 'USER' };
const staff: AuthUser = { type: 'STAFF', userId: null, role: 'STAFF', uid: 'staff-1', employeeNumber: 'E-1', fullName: 'Staff Demo', email: 'staff@citypass.com', module: 'movilidad', groups: ['admin'] };
const delegatedStaff: AuthUser = { ...staff, groups: ['delegados'] };
const staffWithoutAdministration: AuthUser = { ...staff, groups: ['operadores'] };

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
  it('redirige CITIZEN desde administración', () => {
    renderRoute(citizen);
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  it('permite a STAFF autorizado renderizar administración', () => {
    renderRoute(staff);
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('permite a STAFF delegado renderizar administración', () => {
    renderRoute(delegatedStaff);
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });

  it('redirige STAFF sin grupo administrativo', () => {
    renderRoute(staffWithoutAdministration);
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });
});
