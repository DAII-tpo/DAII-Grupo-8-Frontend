import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import { mantineTheme } from '../../styles/theme';
import type { TripResponse } from '../../types/trip';
import { MapPage } from './index';

const { mapSetView } = vi.hoisted(() => ({ mapSetView: vi.fn() }));

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) => (
    <button onClick={eventHandlers?.click} type="button">{children}</button>
  ),
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Marker: ({ children, eventHandlers, icon }: { children: React.ReactNode; eventHandlers?: { click?: () => void }; icon?: { options?: { html?: string } } }) => (
    <button data-recommended={icon?.options?.html?.includes('stationMarkerRecommended') ? 'true' : 'false'} onClick={eventHandlers?.click} type="button">{children}</button>
  ),
  TileLayer: () => null,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: () => ({ setView: mapSetView }),
}));

vi.mock('../../services/stations/stationService', () => ({
  stationService: {
    getAll: vi.fn(),
    getAvailability: vi.fn(),
    getNearby: vi.fn(),
    getRecommendation: vi.fn(),
  },
}));
vi.mock('../../app/providers/authContext', () => ({
  useAuth: () => ({ user: { email: 'user@citypass.com', role: 'USER', userId: 1 } }),
}));
vi.mock('../../services/trips/tripService', () => ({ tripService: { getActive: vi.fn() } }));

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

const recommendedStation = {
  stationId: 1,
  stationName: 'Estacion Centro',
  address: 'Av. Corrientes 100',
  latitude: -34.6037,
  longitude: -58.3816,
  distanceMeters: 320,
  capacity: 20,
  availableBikes: 7,
  availableSlots: 13,
  score: 0.9,
};

const activeTrip: TripResponse = {
  id: 4,
  status: 'ACTIVE',
  bikeId: 7,
  bikeCode: 'BIKE-007',
  originStationId: 1,
  originStationName: 'Estacion Centro',
  destinationStationId: null,
  destinationStationName: null,
  startedAt: '2026-09-24T10:00:00Z',
  endedAt: null,
  durationSeconds: null,
};

function recommendation(source: 'MODEL' | 'FALLBACK' = 'MODEL', purpose: 'PICKUP' | 'DROPOFF' = 'PICKUP') {
  return { status: 'RECOMMENDED' as const, source, purpose, reason: null, message: 'La mejor opción disponible.', station: recommendedStation, alternatives: [], explanation: null, modelVersion: source === 'MODEL' ? 'v1' : null, generatedAt: '2026-09-23T12:00:00Z' };
}

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
  vi.mocked(tripService.getActive).mockResolvedValue(null);
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

  it('muestra el control de ubicación y recentra el mapa sin solicitarla nuevamente', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);

    renderPage();

    const recenterControl = await screen.findByRole('button', { name: 'Ir a mi ubicación' });
    fireEvent.click(recenterControl);

    expect(mapSetView).toHaveBeenLastCalledWith([-34.6037, -58.3816], 17);
    expect(getCurrentPosition).toHaveBeenCalledOnce();
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
    expect(screen.queryByText('Estación registrada')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ir a mi ubicación' })).not.toBeInTheDocument();
  });

  it('muestra un error si falla la consulta de estaciones cercanas', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('No se pudieron cargar las estaciones')).toBeInTheDocument();
  });

  it('muestra una recomendación MODEL y destaca su marcador sin bloquear el mapa', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue(recommendation());
    renderPage();
    expect(await screen.findByText('Estación recomendada para retirar una bicicleta')).toBeInTheDocument();
    expect(screen.getByText('La mejor opción disponible.')).toBeInTheDocument();
    expect(stationService.getRecommendation).toHaveBeenCalledWith(-34.6037, -58.3816, 'PICKUP');
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estacion Centro' })).toHaveAttribute('data-recommended', 'true');
  });

  it('muestra fallback neutral, no recommendation y errores sin impedir el mapa', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue(recommendation('FALLBACK'));
    renderPage();
    expect(await screen.findByText('Alternativa sugerida para retirar una bicicleta')).toBeInTheDocument();
    expect(screen.queryByText('Estación recomendada para retirar una bicicleta')).not.toBeInTheDocument();
  });

  it('muestra NO_RECOMMENDATION sin afectar el mapa ni el listado de estaciones', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue({ status: 'NO_RECOMMENDATION', source: 'MODEL', purpose: 'PICKUP', reason: 'NO_VIABLE_STATION', message: 'No hay bicicletas disponibles cerca.', station: null, alternatives: [], explanation: null, modelVersion: 'v1', generatedAt: '2026-09-23T12:00:00Z' });

    renderPage();

    expect(await screen.findByText('No hay bicicletas disponibles cerca.')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estacion Centro' })).toBeInTheDocument();
    expect(screen.queryByText('No se pudieron cargar las estaciones')).not.toBeInTheDocument();
  });

  it('muestra un aviso discreto cuando falla recommendation y conserva el mapa', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockRejectedValue(new Error('Recommendation unavailable'));

    renderPage();

    expect(await screen.findByText('Recomendación no disponible')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Estacion Centro' })).toBeInTheDocument();
    expect(screen.queryByText('No se pudieron cargar las estaciones')).not.toBeInTheDocument();
  });

  it('mantiene el mapa disponible mientras carga la recomendación', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    let resolveRecommendation!: (value: ReturnType<typeof recommendation>) => void;
    vi.mocked(stationService.getRecommendation).mockReturnValue(new Promise((resolve) => { resolveRecommendation = resolve; }));

    renderPage();

    expect(await screen.findByText('Buscando la mejor estación para retirar una bicicleta...')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    resolveRecommendation(recommendation());
    expect(await screen.findByText('Estación recomendada para retirar una bicicleta')).toBeInTheDocument();
  });

  it('usa DROPOFF y muestra el contexto de devolución cuando el usuario tiene un viaje activo', async () => {
    mockLocationSuccess();
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue(recommendation('MODEL', 'DROPOFF'));

    renderPage();

    expect(await screen.findByText('Estación recomendada para devolver la bicicleta')).toBeInTheDocument();
    expect(stationService.getRecommendation).toHaveBeenCalledWith(-34.6037, -58.3816, 'DROPOFF');
    expect(tripService.getActive).toHaveBeenCalledWith(1);
    expect(tripService.getActive).toHaveBeenCalledTimes(1);
    expect(stationService.getRecommendation).toHaveBeenCalledTimes(1);
  });

  it('mantiene FALLBACK neutral cuando recomienda una estación para devolver', async () => {
    mockLocationSuccess();
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue(recommendation('FALLBACK', 'DROPOFF'));

    renderPage();

    expect(await screen.findByText('Alternativa sugerida para devolver la bicicleta')).toBeInTheDocument();
    expect(screen.queryByText('Estación recomendada para devolver la bicicleta')).not.toBeInTheDocument();
  });

  it('mantiene PICKUP y el mapa disponible si falla la consulta del viaje activo', async () => {
    mockLocationSuccess();
    vi.mocked(tripService.getActive).mockRejectedValueOnce(new Error('Trip unavailable'));
    vi.mocked(stationService.getNearby).mockResolvedValue([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValue([{ ...station, id: 1, name: 'Estacion Centro', address: 'Av. Corrientes 100' }]);
    vi.mocked(stationService.getRecommendation).mockResolvedValue(recommendation());

    renderPage();

    expect(await screen.findByText('Estación recomendada para retirar una bicicleta')).toBeInTheDocument();
    expect(stationService.getRecommendation).toHaveBeenCalledWith(-34.6037, -58.3816, 'PICKUP');
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
});
