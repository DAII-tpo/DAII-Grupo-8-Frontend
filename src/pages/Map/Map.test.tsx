import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { MapPage } from './index';

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) => (
    <button onClick={eventHandlers?.click} type="button">{children}</button>
  ),
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: () => ({ setView: vi.fn() }),
}));

vi.mock('../../services/stations/stationService', () => ({
  stationService: {
    getAll: vi.fn(),
    getAvailability: vi.fn(),
    getNearby: vi.fn(),
  },
}));

type PositionSuccess = (position: GeolocationPosition) => void;
type PositionError = (error: GeolocationPositionError) => void;

const getCurrentPosition = vi.fn<(success: PositionSuccess, error?: PositionError) => void>();

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
  id: 2,
  name: 'Estacion Parque',
  address: 'Av. Santa Fe 500',
  latitude: -34.59,
  longitude: -58.39,
  capacity: 18,
  status: 'ACTIVE' as const,
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
  deletedAt: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad/mapa']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<CurrentPath />} />
          <Route path="/movilidad/mapa" element={<MapPage />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}</output>;
}

function mockLocationSuccess() {
  getCurrentPosition.mockImplementationOnce((success) => {
    success({ coords: { latitude: -34.6037, longitude: -58.3816 } } as GeolocationPosition);
  });
}

beforeEach(() => {
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('MapPage', () => {
  it('permite volver a Inicio desde la navegación interna', () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('data-active', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Inicio' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad');
  });

  it('permite navegar al directorio de estaciones desde la navegación interna', () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByRole('tab', { name: 'Mapa' })).toHaveAttribute('data-active', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Estaciones' }));

    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/estaciones');
  });

  it('consulta estaciones cercanas con la ubicación obtenida y permite seleccionarlas', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([
      { ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' },
      station,
    ]);

    renderPage();

    expect(await screen.findByTestId('map')).toBeInTheDocument();
    expect(stationService.getNearby).toHaveBeenCalledWith({ lat: -34.6037, lng: -58.3816 });
    expect(screen.getByRole('button', { name: 'Estacion Parque' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Estacion Centro' }));

    expect(await screen.findByText('Bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getAllByText('320 m')).toHaveLength(2);
  });

  it('muestra todas las estaciones cuando no hay estaciones cercanas', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Estacion Parque' })).toBeInTheDocument();
    expect(stationService.getAll).toHaveBeenCalledOnce();
    expect(screen.getByText('No se encontraron estaciones activas dentro del radio de búsqueda.')).toBeInTheDocument();
  });

  it('usa estaciones registradas sin llamar nearby cuando la geolocalización es denegada', async () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
    });
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      stationId: 2,
      stationName: 'Estacion Parque',
      status: 'ACTIVE',
      capacity: 18,
      availableBikes: 4,
      availableSlots: 14,
      checkedAt: '2026-09-08T14:30:00Z',
    });

    renderPage();

    expect(await screen.findByText('Ubicación no disponible')).toBeInTheDocument();
    expect(stationService.getNearby).not.toHaveBeenCalled();
    expect(stationService.getAll).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Estacion Parque' }));

    expect(await screen.findByText('Bicicletas disponibles')).toBeInTheDocument();
    expect(stationService.getAvailability).toHaveBeenCalledWith(2);
    expect(screen.queryByText('Distancia')).not.toBeInTheDocument();
  });

  it('muestra un error si falla la consulta de estaciones cercanas', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('No se pudieron cargar las estaciones')).toBeInTheDocument();
  });
});
