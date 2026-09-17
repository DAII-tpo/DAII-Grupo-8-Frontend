import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { bikeService } from '../../services/bikes/bikeService';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import { mantineTheme } from '../../styles/theme';
import { BicyclesPage } from './index';

vi.mock('../../config/currentUser', () => ({ currentUserId: 7 }));
vi.mock('../../services/bikes/bikeService', () => ({ bikeService: { getAvailable: vi.fn() } }));
vi.mock('../../services/stations/stationService', () => ({ stationService: { getAll: vi.fn() } }));
vi.mock('../../services/trips/tripService', () => ({ tripService: { getActive: vi.fn(), start: vi.fn() } }));

const station = {
  id: 2,
  name: 'Estacion Centro',
  address: 'Av. Corrientes 100',
  latitude: -34.6037,
  longitude: -58.3816,
  capacity: 20,
  status: 'ACTIVE' as const,
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
  deletedAt: null,
};

const bike = {
  id: 1,
  code: 'BIKE-001',
  stationId: 2,
  stationName: 'Estacion Centro',
  status: 'AVAILABLE' as const,
  model: 'City Bike',
  purchaseDate: null,
  lastMaintenanceAt: null,
  createdAt: '2026-09-01T10:00:00Z',
  updatedAt: '2026-09-01T10:00:00Z',
};

const activeTrip = {
  id: 3,
  status: 'ACTIVE' as const,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  originStationId: 2,
  originStationName: 'Estacion Centro',
  destinationStationId: null,
  destinationStationName: null,
  startedAt: '2026-09-15T14:00:00Z',
  endedAt: null,
  durationSeconds: null,
};

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad/bicicletas']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<CurrentPath />} />
          <Route path="/movilidad/bicicletas" element={<BicyclesPage />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function mockNoActiveTrip() {
  vi.mocked(tripService.getActive).mockResolvedValueOnce(null);
  vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
}

function httpError(status: number) {
  return Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status },
  });
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('BicyclesPage', () => {
  it('consulta el viaje activo al cargar y muestra el flujo de inicio ante un 204', async () => {
    mockNoActiveTrip();

    renderPage();

    expect(await screen.findByRole('combobox', { name: 'Estación de origen' })).toBeInTheDocument();
    expect(tripService.getActive).toHaveBeenCalledWith(7);
    expect(screen.getByRole('tab', { name: 'Bicicletas/Viajes' })).toHaveAttribute('data-active', 'true');
  });

  it('muestra el viaje activo y no permite iniciar otro', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);

    renderPage();

    expect(await screen.findByText('Tenés un viaje activo')).toBeInTheDocument();
    expect(screen.getByText('BIKE-001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar viaje' })).not.toBeInTheDocument();
    expect(stationService.getAll).not.toHaveBeenCalled();
  });

  it('muestra un error si no puede cargar las estaciones', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(null);
    vi.mocked(stationService.getAll).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('No se pudieron cargar las estaciones')).toBeInTheDocument();
  });

  it('muestra un estado vacío si no hay estaciones', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(null);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('No hay estaciones disponibles')).toBeInTheDocument();
  });

  it('carga las bicicletas al seleccionar una estación', async () => {
    mockNoActiveTrip();
    vi.mocked(bikeService.getAvailable).mockResolvedValueOnce([bike]);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación de origen' }), { target: { value: '2' } });

    expect(await screen.findByRole('radio', { name: 'BIKE-001 - City Bike' })).toBeInTheDocument();
    expect(bikeService.getAvailable).toHaveBeenCalledWith(2);
  });

  it('informa cuando la estación no tiene bicicletas disponibles', async () => {
    mockNoActiveTrip();
    vi.mocked(bikeService.getAvailable).mockResolvedValueOnce([]);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación de origen' }), { target: { value: '2' } });

    expect(await screen.findByText('No hay bicicletas disponibles')).toBeInTheDocument();
  });

  it('explica si la estación no puede entregar bicicletas', async () => {
    mockNoActiveTrip();
    vi.mocked(bikeService.getAvailable).mockRejectedValueOnce(httpError(409));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación de origen' }), { target: { value: '2' } });

    expect(await screen.findByText('La estación seleccionada no está activa para retirar bicicletas.')).toBeInTheDocument();
  });

  it('inicia el viaje seleccionado y muestra su estado activo', async () => {
    mockNoActiveTrip();
    vi.mocked(bikeService.getAvailable).mockResolvedValueOnce([bike]);
    vi.mocked(tripService.start).mockResolvedValueOnce(activeTrip);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación de origen' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('radio', { name: 'BIKE-001 - City Bike' }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje' }));

    expect(await screen.findByText('Tenés un viaje activo')).toBeInTheDocument();
    expect(tripService.start).toHaveBeenCalledWith(7, { bikeId: 1 });
  });

  it('muestra un error entendible si no puede iniciar el viaje', async () => {
    mockNoActiveTrip();
    vi.mocked(bikeService.getAvailable).mockResolvedValueOnce([bike]);
    vi.mocked(tripService.start).mockRejectedValueOnce(httpError(409));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación de origen' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('radio', { name: 'BIKE-001 - City Bike' }));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar viaje' }));

    expect(await screen.findByText('No se pudo iniciar el viaje')).toBeInTheDocument();
    expect(screen.getByText('No podés iniciar el viaje porque ya tenés uno activo o la bicicleta dejó de estar disponible.')).toBeInTheDocument();
  });

  it('permite navegar a Estaciones desde la navegación interna', async () => {
    mockNoActiveTrip();

    renderPage();

    await screen.findByRole('combobox', { name: 'Estación de origen' });
    fireEvent.click(screen.getByRole('tab', { name: 'Estaciones' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/estaciones');
  });
});
