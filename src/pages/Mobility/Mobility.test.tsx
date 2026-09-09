import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { mantineTheme } from '../../styles/theme';
import { MobilityPage } from './index';

afterEach(cleanup);

function CurrentPath() {
  const location = useLocation();

  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderMobilityPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<MobilityPage />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

describe('MobilityPage', () => {
  it('renderiza la pestaña y la tarjeta de Estaciones como accesos a la ruta de estaciones', () => {
    renderMobilityPage();

    expect(screen.getByRole('tab', { name: 'Estaciones' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Estaciones 6 cercanas/ })).toHaveAttribute(
      'href',
      '/movilidad/estaciones',
    );
  });

  it('navega a estaciones al seleccionar la pestaña', () => {
    renderMobilityPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Estaciones' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/estaciones');
  });

  it('navega a estaciones al seleccionar la tarjeta', () => {
    renderMobilityPage();

    fireEvent.click(screen.getByRole('link', { name: /Estaciones 6 cercanas/ }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/estaciones');
  });

  it('marca la tarjeta como activa en la ruta de estaciones', () => {
    render(
      <MemoryRouter initialEntries={['/movilidad/estaciones']}>
        <MantineProvider theme={mantineTheme}>
          <MobilityPage />
        </MantineProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Estaciones 6 cercanas/ }).className).toContain(
      'areaCardActive',
    );
  });
});
