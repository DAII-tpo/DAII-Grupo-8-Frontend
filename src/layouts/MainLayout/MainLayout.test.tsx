import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '../../app/providers/authContext';
import type { AuthUser } from '../../types/auth';
import { mantineTheme } from '../../styles/theme';
import { MainLayout } from './MainLayout';

vi.mock('../../components/mobility/ClimateAlertBanner/ClimateAlertBanner', () => ({
  ClimateAlertBanner: () => null,
}));

const citizen: AuthUser = { type: 'CITIZEN', userId: 1, role: 'CITIZEN', email: 'citizen@citypass.com', firstName: 'Ana', lastName: 'Pérez', groups: [] };
const staff: AuthUser = { type: 'STAFF', userId: 12, role: 'ADMIN', email: 'staff@citypass.com', firstName: 'Staff', lastName: 'Demo', groups: ['admin'] };
const delegatedStaff: AuthUser = { ...staff, groups: ['delegados'] };
const staffWithoutAdministration: AuthUser = { ...staff, role: 'USER', groups: ['operadores'] };

function authValue(user: AuthUser): AuthContextValue {
  return { isAuthenticated: true, isRestoring: false, user, login: vi.fn(), loginCitizen: vi.fn(), registerCitizen: vi.fn(), loginStaff: vi.fn(), logout: vi.fn() };
}

function renderLayout(user: AuthUser, path = '/movilidad') {
  return render(<MemoryRouter initialEntries={[path]}><MantineProvider theme={mantineTheme}><AuthContext.Provider value={authValue(user)}><MainLayout /></AuthContext.Provider></MantineProvider></MemoryRouter>);
}

afterEach(cleanup);

describe('MainLayout', () => {
  it('ofrece las siete secciones de Movilidad y activa únicamente la página elegida', () => {
    renderLayout(citizen);
    const menu = within(screen.getByRole('navigation', { name: 'Menu principal CityPass+' }));
    const routes = [
      ['Inicio', '/movilidad'], ['Mapa', '/movilidad/mapa'],
      ['Estaciones', '/movilidad/estaciones'], ['Eventos', '/movilidad/eventos'],
      ['Bicicletas/Viajes', '/movilidad/bicicletas'], ['Historial', '/movilidad/historial'],
      ['Reportes', '/movilidad/reportes'],
    ];
    for (const [name, path] of routes) {
      expect(menu.getByRole('link', { name })).toHaveAttribute('href', path);
    }
    for (const name of ['Residuos', 'Reclamos', 'Emergencias', 'Espacios Públicos', 'Cultura y Eventos', 'Analítica']) {
      expect(menu.queryByRole('link', { name })).not.toBeInTheDocument();
    }
    expect(menu.getByRole('link', { name: 'Inicio' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(menu.getByRole('link', { name: 'Mapa' }));
    expect(menu.getByRole('link', { name: 'Mapa' })).toHaveAttribute('aria-current', 'page');
    expect(menu.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('muestra las secciones administrativas al ADMIN y marca la sección elegida', () => {
    renderLayout(staff, '/movilidad/administracion?tab=restock');
    const sections = within(screen.getByRole('group', { name: 'Secciones de administración' }));
    expect(sections.getAllByRole('link')).toHaveLength(7);
    expect(sections.getByRole('link', { name: 'Reabastecimiento' })).toHaveAttribute('aria-current', 'page');
    expect(sections.getByRole('link', { name: 'Resumen' })).not.toHaveAttribute('aria-current');
    fireEvent.click(sections.getByRole('link', { name: 'Resumen' }));
    expect(sections.getByRole('link', { name: 'Resumen' })).toHaveAttribute('aria-current', 'page');
  });

  it('oculta las secciones al ciudadano aunque abra una URL administrativa', () => {
    renderLayout(citizen, '/movilidad/administracion?tab=restock');
    expect(screen.queryByRole('group', { name: 'Secciones de administración' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Administración' })).not.toBeInTheDocument();
  });

  it('asocia el viaje activo a Bicicletas/Viajes', () => {
    renderLayout(citizen, '/movilidad/viaje-activo');
    expect(screen.getByRole('link', { name: 'Bicicletas/Viajes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it('oculta gestión administrativa para CITIZEN', () => {
    renderLayout(citizen);
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.getByText('Ciudadano')).toBeInTheDocument();
  });

  it('muestra gestión administrativa para STAFF autorizado', () => {
    renderLayout(staff);
    expect(screen.getByText('Gestión')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Secciones de administración' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Administración' })).toHaveAttribute('href', '/movilidad/administracion');
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
