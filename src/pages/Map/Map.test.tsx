import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { climateService } from '../../services/climate/climateService';
import { tripService } from '../../services/trips/tripService';
import { eventMobilityService } from '../../services/eventMobility/eventMobilityService';
import { cicloviaObstructionService } from '../../services/obstructions/cicloviaObstructionService';
import { mantineTheme } from '../../styles/theme';
import type { TripResponse } from '../../types/trip';
import { MapPage } from './index';

const { leafletMap, mapGetBounds, mapSetView } = vi.hoisted(() => {
  const mapSetView = vi.fn();
  const mapGetBounds = vi.fn();
  const leafletMap = {
    setView: mapSetView,
    getBounds: mapGetBounds,
    on: vi.fn(),
    off: vi.fn(),
  };
  return { leafletMap, mapGetBounds, mapSetView };
});

vi.mock('react-leaflet', () => ({
  CircleMarker: ({ children, eventHandlers }: { children: React.ReactNode; eventHandlers?: { click?: () => void } }) => (
    <button onClick={eventHandlers?.click} type="button">{children}</button>
  ),
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  Marker: ({ children, eventHandlers, icon }: { children: React.ReactNode; eventHandlers?: { click?: () => void }; icon?: { options?: { html?: string } } }) => (
    <button data-climate={icon?.options?.html?.includes('stationMarkerClimate') ? 'true' : 'false'} data-recommended={icon?.options?.html?.includes('stationMarkerRecommended') ? 'true' : 'false'} data-selected={icon?.options?.html?.includes('stationMarkerSelected') ? 'true' : 'false'} onClick={eventHandlers?.click} type="button">{children}</button>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TileLayer: () => null,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useMap: () => leafletMap,
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
  useAuth: () => ({ isAuthenticated: true, user: { type: 'STAFF', userId: 12, role: 'USER', email: 'staff@citypass.com', firstName: 'Staff', lastName: 'Demo', groups: [] } }),
}));
vi.mock('../../services/trips/tripService', () => ({ tripService: { getActive: vi.fn() } }));
vi.mock('../../services/climate/climateService', () => ({ climateService: { getStationStatuses: vi.fn() } }));
vi.mock('../../services/eventMobility/eventMobilityService', () => ({ eventMobilityService: { upcoming: vi.fn() } }));
vi.mock('../../services/obstructions/cicloviaObstructionService', () => ({ cicloviaObstructionService: { getActive: vi.fn() } }));

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

function renderPage(initialEntry = '/movilidad/mapa') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad" element={<CurrentPath />} />
          <Route path="/movilidad/mapa" element={<MapPage />} />
          <Route path="/movilidad/estaciones" element={<CurrentPath />} />
          <Route path="/movilidad/eventos" element={<CurrentPath />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function CurrentPath() {
  const location = useLocation();
  return <output data-testid="current-path">{location.pathname}{location.search}</output>;
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
  vi.mocked(climateService.getStationStatuses).mockResolvedValue([]);
  vi.mocked(eventMobilityService.upcoming).mockResolvedValue([]);
  vi.mocked(cicloviaObstructionService.getActive).mockResolvedValue([]);
  mapGetBounds.mockReturnValue({ getNorth: () => -34.5, getSouth: () => -34.8, getEast: () => -58.2, getWest: () => -58.6 });
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe('MapPage', () => {
  it('ubica una obstrucción activa en el mapa y muestra sus datos al seleccionarla', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(cicloviaObstructionService.getActive).mockResolvedValueOnce([{
      id: 12, reclamoId: 'reclamo-12', ciudadanoId: null, titulo: 'Auto sobre ciclovía',
      descripcion: 'Bloquea el paso', direccion: 'Av. Santa Fe 3500', barrio: 'Palermo',
      latitude: -34.589, longitude: -58.431, impactLevel: 'ALTO', status: 'ACTIVE',
      affectedStationIds: [3, 7], detourDescription: 'Circular por la calle paralela',
      emergencyDispatched: true, createdAt: '2026-11-14T10:00:00Z', resolvedAt: null,
    }]);

    renderPage();

    const marker = await screen.findByRole('button', { name: /Obstrucción de ciclovía · ALTO/ });
    fireEvent.click(marker);
    expect(await screen.findByText('Emergencias notificadas')).toBeInTheDocument();
    expect(screen.getByText('Av. Santa Fe 3500 · Palermo')).toBeInTheDocument();
    expect(screen.getByText('Circular por la calle paralela')).toBeInTheDocument();
    expect(screen.getByText('IDs de estaciones: 3, 7')).toBeInTheDocument();
  });

  it('mantiene el mapa operativo si falla la consulta de obstrucciones', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(cicloviaObstructionService.getActive).mockRejectedValueOnce(new Error('API no disponible'));

    renderPage();

    expect(await screen.findByTestId('map')).toBeInTheDocument();
    expect(screen.queryByText('Obstrucciones activas')).not.toBeInTheDocument();
  });

  it('muestra el marcador naranja del evento y permite abrir su planificador', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-future', title: 'Feria comunitaria', zone: 'Centro', address: 'Plaza',
      latitude: -34.6037, longitude: -58.3816, startsAt: '2030-11-14T15:00:00Z', endsAt: '2030-11-14T18:00:00Z',
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage();

    expect(await screen.findByText('Feria comunitaria')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Planificar llegada' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/eventos?eventId=event-future');
  });

  it('muestra la alerta contextual y Cerrar la descarta sin calcular una recomendación', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-active', title: 'Evento en curso', zone: 'Centro', address: 'Plaza',
      latitude: -34.6037, longitude: -58.3816,
      startsAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage();

    expect(await screen.findByText('Hay un evento en curso cerca')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByText('Hay un evento en curso cerca')).not.toBeInTheDocument();
  });

  it('advierte un evento próximo por cercanía al usuario aunque quede fuera del área visible', async () => {
    mockLocationSuccess();
    mapGetBounds.mockReturnValue({ getNorth: () => -35, getSouth: () => -35.1, getEast: () => -59, getWest: () => -59.1 });
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-nearby', title: 'Encuentro barrial', zone: 'Centro', address: 'Plaza',
      latitude: -34.604, longitude: -58.382,
      startsAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 4 * 60 * 60_000).toISOString(),
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage();

    expect(await screen.findByText('Hay un evento próximo cerca')).toBeInTheDocument();
    mapSetView.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Ver evento' }));
    expect(await screen.findByRole('heading', { name: 'Encuentro barrial' })).toBeInTheDocument();
    expect(mapSetView).not.toHaveBeenCalled();
  });

  it('usa el área visible para advertir eventos cuando se rechaza la geolocalización', async () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.({ code: 1, message: 'Permission denied' } as GeolocationPositionError);
    });
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-without-location', title: 'Festival en curso', zone: 'Centro', address: 'Plaza',
      latitude: -34.6037, longitude: -58.3816,
      startsAt: new Date(Date.now() - 30 * 60_000).toISOString(),
      endsAt: new Date(Date.now() + 60 * 60_000).toISOString(),
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage();

    expect(await screen.findByText('Hay un evento en curso cerca')).toBeInTheDocument();
    expect(screen.getByText('Ubicación no disponible')).toBeInTheDocument();
  });

  it('abre el evento seleccionado sin recentrar ni cambiar el zoom del mapa', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-marker', title: 'Feria del parque', zone: 'Centro', address: 'Plaza',
      latitude: -34.6037, longitude: -58.3816, startsAt: '2030-11-14T15:00:00Z', endsAt: '2030-11-14T18:00:00Z',
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage();

    const eventMarker = await screen.findByRole('button', { name: /Evento: Feria del parque/ });
    await waitFor(() => expect(mapSetView).toHaveBeenCalled());
    mapSetView.mockClear();
    fireEvent.click(eventMarker);

    expect(await screen.findByRole('heading', { name: 'Feria del parque' })).toBeInTheDocument();
    expect(mapSetView).not.toHaveBeenCalled();
  });

  it('destaca una estación solicitada y permite volver al planificador', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([{ ...station, id: 1, name: 'Estacion Centro' }]);
    vi.mocked(eventMobilityService.upcoming).mockResolvedValueOnce([{
      eventId: 'event-map', title: 'Feria del parque', zone: 'Centro', address: 'Plaza',
      latitude: -34.6037, longitude: -58.3816, startsAt: '2030-11-14T15:00:00Z', endsAt: '2030-11-14T18:00:00Z',
      maxCapacity: 100, registrations: 10, expectedDemand: 10,
    }]);

    renderPage('/movilidad/mapa?eventId=event-map&focus=station&stationId=1&latitude=-34.61&longitude=-58.41&returnTo=planner');

    const marker = await screen.findByRole('button', { name: 'Estacion Centro' });
    expect(marker).toHaveAttribute('data-selected', 'true');
    expect(mapSetView).toHaveBeenLastCalledWith([-34.61, -58.41], 16);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al planificador' }));
    expect(screen.getByTestId('current-path')).toHaveTextContent('/movilidad/eventos?eventId=event-map&resume=1');
  });

  it('marca la estación afectada sin impedir el mapa ni la selección', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);
    vi.mocked(stationService.getAll).mockResolvedValueOnce([{ ...station, id: 1, name: 'Estacion Centro' }]);
    vi.mocked(climateService.getStationStatuses).mockResolvedValueOnce([{
      stationId: 1,
      alerta: { alertaId: 'weather-1', nivelCriticidad: 'ALTA', fenomeno: 'GRANIZO',
        barrios: ['San Nicolás'], vigenciaDesde: '2026-11-12T10:00:00Z',
        vigenciaHasta: '2026-11-13T10:00:00Z', activa: true },
    }]);

    renderPage();

    const marker = await screen.findByRole('button', { name: /Estacion Centro · Alerta ALTA/ });
    expect(marker).toHaveAttribute('data-climate', 'true');
    fireEvent.click(marker);
    expect(await screen.findByText('Alerta climática alta')).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });
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

  it('mantiene el mapa con estaciones cercanas si el catálogo requiere otra autenticación', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getAll).mockRejectedValueOnce(new Error('401'));
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([nearbyStation]);

    renderPage();

    expect(await screen.findByRole('button', { name: 'Estacion Centro' })).toBeInTheDocument();
    expect(screen.getByTestId('map')).toBeInTheDocument();
    expect(screen.queryByText('No se pudieron cargar las estaciones')).not.toBeInTheDocument();
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

  it('distingue una sesión rechazada (401) de un error de conexión', async () => {
    mockLocationSuccess();
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getNearby).mockRejectedValueOnce(Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status: 401 } }));

    renderPage();

    expect(await screen.findByText('Sesión no válida')).toBeInTheDocument();
    expect(screen.queryByText('No se pudieron cargar las estaciones')).not.toBeInTheDocument();
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
    expect(tripService.getActive).toHaveBeenCalledWith();
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
