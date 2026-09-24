import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { authStorageKey } from '../../config/demoAuth';
import { AuthProvider } from '../providers/AuthProvider';
import { RequireRole } from './RequireRole';

function renderRoute(user: { email: string; role: 'USER' | 'ADMIN'; userId: number }) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
  return render(<MemoryRouter initialEntries={['/movilidad/administracion']}><AuthProvider><Routes>
    <Route path="/movilidad" element={<div>Movilidad</div>} />
    <Route path="/movilidad/administracion" element={<RequireRole role="ADMIN"><div>Administración</div></RequireRole>} />
  </Routes></AuthProvider></MemoryRouter>);
}

afterEach(() => window.localStorage.clear());

describe('RequireRole', () => {
  it('redirige USER desde administración', () => {
    renderRoute({ email: 'user@citypass.com', role: 'USER', userId: 1 });
    expect(screen.getByText('Movilidad')).toBeInTheDocument();
    expect(screen.queryByText('Administración')).not.toBeInTheDocument();
  });

  it('permite a ADMIN renderizar administración', () => {
    renderRoute({ email: 'admin@citypass.com', role: 'ADMIN', userId: 2 });
    expect(screen.getByText('Administración')).toBeInTheDocument();
  });
});
