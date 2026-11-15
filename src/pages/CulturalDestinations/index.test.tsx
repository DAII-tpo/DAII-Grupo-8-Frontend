import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { culturalDestinationService as service } from '../../services/destinations/culturalDestinationService';
import { eventMobilityService } from '../../services/eventMobility/eventMobilityService';
import { stationService } from '../../services/stations/stationService';
import type { StationRecommendation } from '../../types/stationRecommendation';
import { CulturalDestinationsPage } from './index';

vi.mock('../../services/destinations/culturalDestinationService', () => ({
  culturalDestinationService: { upcoming: vi.fn(), recommendation: vi.fn() },
}));
vi.mock('../../services/eventMobility/eventMobilityService', () => ({
  eventMobilityService: { decide: vi.fn(), getArrivalIntent: vi.fn(), registerArrivalIntent: vi.fn(), cancelArrivalIntent: vi.fn() },
}));
vi.mock('../../services/stations/stationService', () => ({
  stationService: { getAll: vi.fn(), getAllAvailability: vi.fn(), getAvailability: vi.fn(), getRecommendation: vi.fn() },
}));
vi.mock('../../components/mobility/MobilityNavigation', () => ({ MobilityNavigation: () => null }));
const event = { eventId: 'ev-1', title: 'Festival', zone: 'Centro', address: null,
  latitude: -34.6, longitude: -58.4, startsAt: '2026-11-01T15:00:00Z',
  endsAt: '2026-11-01T18:00:00Z', registrations: 12, maxCapacity: 100 };
const result: StationRecommendation = { status: 'RECOMMENDED', source: 'FALLBACK', purpose: 'DROPOFF',
  reason: null, message: 'Estación segura', alternatives: [], explanation: null, modelVersion: null,
  generatedAt: '2026-11-01T15:00:00Z', station: { stationId: 1, stationName: 'Estación Parque',
    address: 'Parque', latitude: -34.6, longitude: -58.4, distanceMeters: 200, capacity: 20,
    availableBikes: 5, availableSlots: 15, score: null } };
const pickup: StationRecommendation = { ...result, purpose: 'PICKUP', station: { ...result.station!,
  stationId: 10, stationName: 'Estación Origen', latitude: -34.61, longitude: -58.41,
  distanceMeters: 180, availableBikes: 7, availableSlots: 13 } };
const alternative = { ...result.station!, stationId: 2, stationName: 'Estación Alternativa',
  latitude: -34.59, longitude: -58.39, distanceMeters: 650, availableSlots: 8 };
const registeredStation = { id: 10, name: 'Estación Origen', address: 'Origen 100', latitude: -34.61,
  longitude: -58.41, capacity: 20, status: 'ACTIVE' as const, createdAt: '', updatedAt: '', deletedAt: null };
const availability = { stationId: 10, stationName: 'Estación Origen', status: 'ACTIVE' as const,
  capacity: 20, availableBikes: 7, availableSlots: 13, checkedAt: '2026-11-01T14:00:00Z' };
function mount() { render(<MantineProvider><MemoryRouter><CulturalDestinationsPage /></MemoryRouter></MantineProvider>); }
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(service.upcoming).mockResolvedValue([event]);
  vi.mocked(stationService.getAll).mockResolvedValue([registeredStation]);
  vi.mocked(stationService.getAllAvailability).mockResolvedValue([availability]);
  vi.mocked(stationService.getRecommendation).mockResolvedValue(pickup);
  vi.mocked(eventMobilityService.decide).mockResolvedValue({
    mode: 'ATTENDING', pickup, dropoff: { ...result, alternatives: [alternative] },
    alternativeDropoff: null, message: 'Disponibilidad informativa.',
  });
  vi.mocked(eventMobilityService.getArrivalIntent).mockResolvedValue(null);
  vi.mocked(eventMobilityService.registerArrivalIntent).mockResolvedValue({ eventId: 'ev-1', stationId: 1, arrivalAt: event.startsAt, status: 'ACTIVE' });
  vi.mocked(eventMobilityService.cancelArrivalIntent).mockResolvedValue();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: vi.fn((success: PositionCallback) => success({
      coords: { latitude: -34.612, longitude: -58.412 },
    } as GeolocationPosition)),
  } });
});
afterEach(cleanup);
it('muestra la carga y luego eventos con cupo y ubicación', async () => {
  mount(); expect(screen.getByText('Cargando eventos…')).toBeInTheDocument();
  expect(await screen.findByText('Festival')).toBeInTheDocument();
  expect(screen.getByText('Centro')).toBeInTheDocument();
  expect(screen.getByText('Inscriptos: 12 · Cupo: 100')).toBeInTheDocument();
});
it('muestra el vacío sin inventar eventos', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([]); mount();
  expect(await screen.findByText('Sin próximos eventos disponibles')).toBeInTheDocument();
});
it('permite reintentar una consulta fallida', async () => {
  vi.mocked(service.upcoming).mockRejectedValueOnce(new Error('offline')); mount();
  expect(await screen.findByText('No se pudieron consultar los destinos')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  expect(await screen.findByText('Festival')).toBeInTheDocument();
});
it('selecciona un origen con bicicletas y planifica la llegada al evento', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Podés cambiar la estación desde donde salís.');
  expect(screen.queryByText('¿Estás inscripto en este evento?')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Calcular plan' }));
  expect(await screen.findByText('Tu plan de llegada al evento')).toBeInTheDocument();
  expect(screen.getByText(/Destino recomendado: Estación Parque/)).toBeInTheDocument();
  expect(screen.getByText(/Alternativa 1: Estación Alternativa/)).toBeInTheDocument();
  expect(screen.getByText(/200 m del evento/)).toHaveTextContent('15 anclajes libres');
  expect(eventMobilityService.decide).toHaveBeenCalledWith('ev-1', {
    attending: true, originLatitude: -34.61, originLongitude: -58.41,
  });
  expect(screen.queryByText('Ver trayecto en Google Maps')).not.toBeInTheDocument();
});

it('calcula destinos cercanos al evento seleccionado', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Podés cambiar la estación desde donde salís.');
  fireEvent.click(screen.getByRole('button', { name: 'Calcular plan' }));
  expect(await screen.findByText('Tu plan de llegada al evento')).toBeInTheDocument();
  expect(eventMobilityService.decide).toHaveBeenCalledWith('ev-1', expect.objectContaining({ attending: true }));
});

it('ofrece selección manual cuando no se autoriza la geolocalización', async () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: {
    getCurrentPosition: vi.fn((_success: PositionCallback, error: PositionErrorCallback) => error({} as GeolocationPositionError)),
  } });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  expect(await screen.findByText('Elegí el origen manualmente')).toBeInTheDocument();
  await screen.findByRole('option', { name: /Estación Origen/ });
  fireEvent.change(screen.getByLabelText('Estación de origen'), { target: { value: '10' } });
  expect(screen.getByRole('option', { name: /Estación Origen · 7 bicicletas/ })).toBeInTheDocument();
  expect(stationService.getRecommendation).not.toHaveBeenCalled();
});
it('usa la dirección y la ubicación genérica si no hay zona', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([{ ...event, address: 'Av. Corrientes' },
    { ...event, eventId: 'ev-2', title: 'Teatro', zone: null }]); mount();
  expect(await screen.findByText('Av. Corrientes')).toBeInTheDocument();
  expect(screen.getByText('Ubicación registrada')).toBeInTheDocument();
});

it('actualizar descarta el plan si el evento ya no está disponible', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Planificá tu llegada al evento');
  vi.mocked(service.upcoming).mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('Sin próximos eventos disponibles');
  expect(screen.queryByText('Planificá tu llegada al evento')).not.toBeInTheDocument();
});

it('muestra la demanda máxima recibida para un evento con cupo completo', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([{ ...event, expectedDemand: 100 }]);
  mount();
  expect(await screen.findByText('Cupo completo')).toBeInTheDocument();
  expect(screen.getByText('Demanda de referencia: 100 asistentes')).toBeInTheDocument();
});

it('avisa cuando el evento no tiene coordenadas válidas', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([{ ...event, latitude: Number.NaN, longitude: Number.NaN }]);
  mount();
  expect(await screen.findByText('Ubicación no disponible')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ver ubicación en el mapa' })).not.toBeInTheDocument();
});

it('muestra el error cuando no se puede calcular el plan', async () => {
  vi.mocked(eventMobilityService.decide).mockRejectedValueOnce(new Error('offline'));
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Podés cambiar la estación desde donde salís.');
  fireEvent.click(screen.getByRole('button', { name: 'Calcular plan' }));
  expect(await screen.findByText('No se pudo calcular el plan con la disponibilidad actual.')).toBeInTheDocument();
});

it('registra y cancela la estación de devolución elegida', async () => {
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Podés cambiar la estación desde donde salís.');
  fireEvent.click(screen.getByRole('button', { name: 'Calcular plan' }));
  fireEvent.click((await screen.findAllByRole('button', { name: 'Voy a utilizar esta estación' }))[0]);
  const confirmation = await screen.findByRole('alert', { name: 'Intención de llegada registrada' });
  expect(confirmation).toHaveTextContent('Listo, elegiste Estación Parque');
  expect(eventMobilityService.registerArrivalIntent).toHaveBeenCalledWith('ev-1', 1, event.startsAt);
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar intención' }));
  await screen.findByRole('button', { name: 'Voy a utilizar esta estación' });
  expect(eventMobilityService.cancelArrivalIntent).toHaveBeenCalledWith('ev-1');
});

it('mantiene el plan sin destinos cuando la recomendación no está disponible', async () => {
  vi.mocked(eventMobilityService.decide).mockResolvedValueOnce({
    mode: 'ATTENDING', pickup: pickup, dropoff: null, alternativeDropoff: null,
    message: 'No hay estaciones viables.',
  });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Podés cambiar la estación desde donde salís.');
  fireEvent.click(screen.getByRole('button', { name: 'Calcular plan' }));
  expect(await screen.findByText('No hay una estación de destino viable con la disponibilidad actual.')).toBeInTheDocument();
});

it('permite elegir manualmente una estación cuya disponibilidad debe consultarse', async () => {
  vi.mocked(stationService.getAllAvailability).mockResolvedValueOnce([]);
  vi.mocked(stationService.getAvailability).mockResolvedValueOnce(availability);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  await screen.findByText('Elegí el origen manualmente');
  fireEvent.change(screen.getByLabelText('Estación de origen'), { target: { value: '10' } });
  expect(stationService.getAvailability).toHaveBeenCalledWith(10);
});

it('muestra un error cuando falla el catálogo de estaciones', async () => {
  vi.mocked(stationService.getAll).mockRejectedValueOnce(new Error('offline'));
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Planificá tu llegada' }));
  expect(await screen.findByText('No se pudieron consultar estaciones reales en este momento.')).toBeInTheDocument();
});
