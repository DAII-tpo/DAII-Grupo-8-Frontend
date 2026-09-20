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
vi.mock('../../services/stations/stationService', () => ({ stationService: { getAll: vi.fn(), getAvailability: vi.fn() } }));
vi.mock('../../services/trips/tripService', () => ({ tripService: { end: vi.fn(), getActive: vi.fn(), start: vi.fn() } }));

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

const stationAvailability = {
  stationId: 2,
  stationName: 'Estacion Centro',
  status: 'ACTIVE' as const,
  capacity: 20,
  availableBikes: 5,
  availableSlots: 15,
  checkedAt: '2026-09-17T10:00:00Z',
};

const completedTrip = {
  ...activeTrip,
  status: 'COMPLETED' as const,
  destinationStationId: 2,
  destinationStationName: 'Estacion Centro',
  endedAt: '2026-09-17T14:30:00Z',
  durationSeconds: 1800,
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

function mockActiveTrip() {
  vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);
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
    mockActiveTrip();

    renderPage();

    expect(await screen.findByText('Tenés un viaje activo')).toBeInTheDocument();
    expect(screen.getByText('En curso')).toBeInTheDocument();
    expect(screen.getByText('BIKE-001')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Iniciar viaje' })).not.toBeInTheDocument();
    expect(await screen.findByRole('combobox', { name: 'Estación destino' })).toBeInTheDocument();
  });

  it('consulta la disponibilidad al seleccionar una estación destino', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce(stationAvailability);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });

    expect(await screen.findByText('Espacios libres')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(stationService.getAvailability).toHaveBeenCalledWith(2);
    expect(screen.getByRole('button', { name: 'Confirmar devolución' })).toBeEnabled();
  });

  it('deshabilita la confirmación cuando la estación destino no tiene espacios', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      ...stationAvailability,
      availableSlots: 0,
    });

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });

    expect(await screen.findByText('No hay espacios disponibles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar devolución' })).toBeDisabled();
  });

  it('muestra un error si no puede consultar la disponibilidad del destino', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockRejectedValueOnce(httpError(404));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });

    expect(await screen.findByText('La estación seleccionada ya no está disponible.')).toBeInTheDocument();
  });

  it('no permite finalizar el viaje sin seleccionar una estación destino', async () => {
    mockActiveTrip();

    renderPage();

    await screen.findByRole('combobox', { name: 'Estación destino' });
    expect(screen.queryByRole('button', { name: 'Confirmar devolución' })).not.toBeInTheDocument();
  });

  it('finaliza el viaje y muestra los datos reales de la devolución', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce(stationAvailability);
    vi.mocked(tripService.end).mockResolvedValueOnce(completedTrip);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar devolución' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar viaje' }));

    expect(await screen.findByText('Viaje finalizado')).toBeInTheDocument();
    expect(tripService.end).toHaveBeenCalledWith(7, 3, { destinationStationId: 2 });
    expect(screen.getAllByText('Estacion Centro')).toHaveLength(2);
    expect(screen.getByText('30 min 0 s')).toBeInTheDocument();
  });

  it('muestra el estado de carga mientras finaliza el viaje', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce(stationAvailability);
    let resolveEnd: (trip: typeof completedTrip) => void;
    const endPromise = new Promise<typeof completedTrip>((resolve) => {
      resolveEnd = resolve;
    });
    vi.mocked(tripService.end).mockReturnValueOnce(endPromise);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar devolución' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar viaje' }));

    expect(screen.getByRole('button', { name: 'Finalizar viaje' })).toBeDisabled();

    resolveEnd!(completedTrip);
    expect(await screen.findByText('Viaje finalizado')).toBeInTheDocument();
  });

  it('mantiene el viaje activo cuando el backend rechaza la devolución', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce(stationAvailability);
    vi.mocked(tripService.end).mockRejectedValueOnce(httpError(409));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar devolución' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar viaje' }));

    expect(await screen.findByText('La devolución no puede completarse. Verificá que la estación esté activa y tenga espacios disponibles.')).toBeInTheDocument();
    expect(screen.getByText('Tenés un viaje activo')).toBeInTheDocument();
  });

  it('mantiene el viaje activo cuando el viaje o la estación ya no existen', async () => {
    mockActiveTrip();
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce(stationAvailability);
    vi.mocked(tripService.end).mockRejectedValueOnce(httpError(404));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Estación destino' }), { target: { value: '2' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar devolución' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar viaje' }));

    expect(await screen.findByText('El viaje, la estación o los datos asociados ya no están disponibles.')).toBeInTheDocument();
    expect(screen.getByText('Tenés un viaje activo')).toBeInTheDocument();
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
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);

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
