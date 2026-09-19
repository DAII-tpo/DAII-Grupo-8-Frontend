import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import { mantineTheme } from '../../styles/theme';
import { MobilityPage } from './index';

vi.mock('../../config/currentUser', () => ({ currentUserId: 1 }));

vi.mock('../../services/stations/stationService', () => ({
  stationService: { getAll: vi.fn(), getNearby: vi.fn() },
}));

vi.mock('../../services/trips/tripService', () => ({
  tripService: { getActive: vi.fn(), getHistory: vi.fn() },
}));

const nearbyStation = {
  stationId: 1,
  stationName: 'Estacion Centro',
  address: 'Av. Corrientes 100',
  latitude: -34.6037,
  longitude: -58.3816,
  distanceMeters: 320,
  capacity: 20,
  availableBikes: 7,
  availableSlots: 13,
};

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

const completedTrip = {
  id: 3,
  status: 'COMPLETED' as const,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  originStationId: 1,
  originStationName: 'Estacion Centro',
  destinationStationId: 2,
  destinationStationName: 'Estacion Parque',
  startedAt: '2026-09-17T14:00:00Z',
  endedAt: '2026-09-17T14:30:00Z',
  durationSeconds: 1800,
};

const activeTrip = {
  ...completedTrip,
  status: 'ACTIVE' as const,
  destinationStationId: null,
  destinationStationName: null,
  endedAt: null,
  durationSeconds: null,
};

const getCurrentPosition = vi.fn<(success: PositionCallback, error?: PositionErrorCallback) => void>();

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<MobilityPage />} />
          <Route path="/movilidad/mapa" element={<CurrentPath />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  vi.mocked(stationService.getAll).mockResolvedValue([station]);
  vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
  vi.mocked(tripService.getActive).mockResolvedValue(null);
  vi.mocked(tripService.getHistory).mockResolvedValue({ content: [completedTrip], page: 0, size: 1, totalElements: 4, totalPages: 4, last: false });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MobilityPage', () => {
  it('muestra un tablero ciudadano con datos reales y acciones rápidas', async () => {
    getCurrentPosition.mockImplementationOnce((success) => success({ coords: { latitude: -34.6037, longitude: -58.3816 } } as GeolocationPosition));

    renderPage();

    expect(await screen.findByText('No tenés un viaje en curso')).toBeInTheDocument();
    expect(screen.getByText('Viajes realizados')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Estación recomendada')).toBeInTheDocument();
    expect(screen.getAllByText('7')).toHaveLength(2);
    expect(screen.getByText('Último viaje')).toBeInTheDocument();
    expect(stationService.getNearby).toHaveBeenCalledWith({ lat: -34.6037, lng: -58.3816, limit: 1 });
    expect(tripService.getHistory).toHaveBeenCalledWith(1, 0, 1);
  });

  it('destaca el viaje activo y habilita el acceso al reporte', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);

    renderPage();

    expect(await screen.findByText('BIKE-001 está en uso')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver viaje activo' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reportar problema' })).toHaveAttribute('href', '/movilidad/reportes');
  });

  it('mantiene la navegación interna y permite abrir el mapa', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('data-active', 'true'));
    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/mapa');
  });
});
