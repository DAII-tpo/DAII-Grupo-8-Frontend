import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { MobilityPage } from './index';

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
          <Route path="/movilidad/mapa" element={<CurrentPath />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
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

describe('MobilityPage', () => {
  it('integra el mapa real, las estaciones cercanas y la selección de una estación', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);

    renderMobilityPage();

    expect(await screen.findByTestId('map')).toBeInTheDocument();
    expect(stationService.getNearby).toHaveBeenCalledWith({ lat: -34.6037, lng: -58.3816 });
    expect(screen.getByText('Estaciones cercanas')).toBeInTheDocument();
    expect(screen.queryByText('Estacion Plaza Norte')).not.toBeInTheDocument();
    expect(screen.queryByText('Reservar bicicleta')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Estacion Centro' }));

    expect(await screen.findByText('Bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getAllByText('320 m')).toHaveLength(2);
  });

  it('muestra el estado vacío real si nearby no devuelve estaciones', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);

    renderMobilityPage();

    expect(await screen.findByText('No se encontraron estaciones activas dentro del radio de búsqueda.')).toBeInTheDocument();
  });

  it('marca Inicio como activo y mantiene la navegación al mapa', () => {
    vi.mocked(stationService.getNearby).mockResolvedValue([]);

    renderMobilityPage();

    expect(screen.getByRole('tab', { name: 'Inicio' })).toHaveAttribute('data-active', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Mapa' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/mapa');
  });
});
