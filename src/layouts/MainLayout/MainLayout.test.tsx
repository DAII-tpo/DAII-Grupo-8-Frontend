import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { AuthProvider } from '../../app/providers/AuthProvider';
import { authStorageKey } from '../../config/demoAuth';
import { mantineTheme } from '../../styles/theme';
import { MainLayout } from './MainLayout';

function renderLayout(user: { email: string; role: 'USER' | 'ADMIN'; userId: number }) {
  window.localStorage.setItem(authStorageKey, JSON.stringify(user));
  return render(<MemoryRouter><MantineProvider theme={mantineTheme}><AuthProvider><MainLayout /></AuthProvider></MantineProvider></MemoryRouter>);
}

afterEach(() => { cleanup(); window.localStorage.clear(); });

describe('MainLayout', () => {
  it('oculta gestión administrativa para USER', () => {
    renderLayout({ email: 'user@citypass.com', role: 'USER', userId: 1 });
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.getByText('Ciudadano')).toBeInTheDocument();
  });

  it('muestra gestión administrativa para ADMIN', () => {
    renderLayout({ email: 'admin@citypass.com', role: 'ADMIN', userId: 2 });
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });
});
