import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { StationsPage } from './index';

vi.mock('../../services/stations/stationService', () => ({
  stationService: {
    getAll: vi.fn(),
    getAvailability: vi.fn(),
  },
}));

const station = {
  id: 1,
  name: 'Estacion Centro',
  address: 'Av. Corrientes 100',
  latitude: -34.6037,
  longitude: -58.3816,
  capacity: 20,
  status: 'ACTIVE' as const,
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
  deletedAt: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad/estaciones']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<CurrentPath />} />
          <Route path="/movilidad/estaciones" element={<StationsPage />} />
          <Route path="/movilidad/mapa" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

describe('StationsPage', () => {
  it('permite volver a Inicio desde la navegación interna', () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Estaciones' })).toHaveAttribute('data-active', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad');
  });

  it('permite navegar al mapa desde la navegación interna', () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Estaciones' })).toHaveAttribute('data-active', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/mapa');
  });

  it('muestra el estado vacío cuando la API no devuelve estaciones', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByText('Cargando estaciones...')).toBeInTheDocument();
    expect(await screen.findByText('No hay estaciones registradas')).toBeInTheDocument();
  });

  it('muestra las estaciones recibidas desde el servicio', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([
      station,
    ]);

    renderPage();

    expect(await screen.findByText('Estacion Centro')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('permite buscar estaciones por nombre o dirección', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([
      station,
      { ...station, id: 2, name: 'Estacion Parque', address: 'Av. Santa Fe 500' },
    ]);

    renderPage();

    await screen.findByText('Estacion Centro');
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar estaciones' }), {
      target: { value: 'Santa Fe' },
    });

    expect(screen.getByText('Estacion Parque')).toBeInTheDocument();
    expect(screen.queryByText('Estacion Centro')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 2')).toBeInTheDocument();
  });

  it('ordena las estaciones desde la más cercana cuando hay ubicación', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (success: PositionCallback) => success({
          coords: { latitude: -34.6037, longitude: -58.3816 },
        } as GeolocationPosition),
      },
    });
    vi.mocked(stationService.getAll).mockResolvedValueOnce([
      { ...station, id: 2, name: 'Estacion Lejana', latitude: -34.7, longitude: -58.5 },
      station,
    ]);

    renderPage();

    expect(await screen.findByText('0 m')).toBeInTheDocument();
    const stationButtons = screen.getAllByRole('button', { name: /Consultar disponibilidad de/ });
    expect(stationButtons[0]).toHaveAccessibleName('Consultar disponibilidad de Estacion Centro');
    expect(screen.getByText('Ordenadas desde la más cercana.')).toBeInTheDocument();
  });

  it('muestra un error si falla la consulta', async () => {
    vi.mocked(stationService.getAll).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('No se pudieron cargar las estaciones')).toBeInTheDocument();
  });

  it('consulta y muestra la disponibilidad de la estación seleccionada', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      stationId: 1,
      stationName: 'Estacion Centro',
      status: 'ACTIVE',
      capacity: 20,
      availableBikes: 7,
      availableSlots: 13,
      checkedAt: '2026-09-08T14:30:00Z',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(stationService.getAvailability).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getByText(/Última actualización:/)).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ocultar disponibilidad de Estacion Centro' })).toHaveAttribute('aria-expanded', 'true');
  });

  it('informa cuando la estación seleccionada no tiene bicicletas disponibles', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      stationId: 1,
      stationName: 'Estacion Centro',
      status: 'ACTIVE',
      capacity: 20,
      availableBikes: 0,
      availableSlots: 20,
      checkedAt: '2026-09-08T14:30:00Z',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(await screen.findByText('No hay bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getByText('Esta estación no cuenta con bicicletas disponibles en este momento.')).toBeInTheDocument();
  });

  it('muestra un error si falla la consulta de disponibilidad', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockRejectedValueOnce(new Error('Not found'));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(await screen.findByText('No se pudo consultar la disponibilidad')).toBeInTheDocument();
  });
});
