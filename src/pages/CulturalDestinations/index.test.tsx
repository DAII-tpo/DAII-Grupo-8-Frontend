import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { culturalDestinationService as service } from '../../services/destinations/culturalDestinationService';
import type { StationRecommendation } from '../../types/stationRecommendation';
import { CulturalDestinationsPage } from './index';

vi.mock('../../services/destinations/culturalDestinationService', () => ({
  culturalDestinationService: { upcoming: vi.fn(), recommendation: vi.fn() },
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
function mount() { render(<MantineProvider><MemoryRouter><CulturalDestinationsPage /></MemoryRouter></MantineProvider>); }
beforeEach(() => { vi.resetAllMocks(); vi.mocked(service.upcoming).mockResolvedValue([event]); });
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
it('recomienda y enlaza las coordenadas de la estación', async () => {
  vi.mocked(service.recommendation).mockResolvedValue(result); mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Ver estación recomendada' }));
  expect(await screen.findByText('Estación Parque')).toBeInTheDocument();
  expect(service.recommendation).toHaveBeenCalledWith('ev-1');
  expect(screen.getByRole('link', { name: 'Cómo llegar a la estación' }))
    .toHaveAttribute('href', 'https://www.google.com/maps/dir/?api=1&destination=-34.6,-58.4');
});
it('explica la ausencia de estación sin ofrecer navegación', async () => {
  vi.mocked(service.recommendation).mockResolvedValue({ ...result, status: 'NO_RECOMMENDATION', station: null });
  mount(); fireEvent.click(await screen.findByRole('button', { name: 'Ver estación recomendada' }));
  expect(await screen.findByText('Sin estación para recomendar')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
it('informa un fallo de recomendación y permite reintentar', async () => {
  vi.mocked(service.recommendation).mockRejectedValueOnce(new Error('cancelled')).mockResolvedValue(result);
  mount(); const button = await screen.findByRole('button', { name: 'Ver estación recomendada' });
  fireEvent.click(button); expect(await screen.findByText('No se pudo obtener la recomendación')).toBeInTheDocument();
  fireEvent.click(button); expect(await screen.findByText('Estación Parque')).toBeInTheDocument();
});
it('usa la dirección y la ubicación genérica si no hay zona', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([{ ...event, address: 'Av. Corrientes' },
    { ...event, eventId: 'ev-2', title: 'Teatro', zone: null }]); mount();
  expect(await screen.findByText('Av. Corrientes')).toBeInTheDocument();
  expect(screen.getByText('Ubicación registrada')).toBeInTheDocument();
});

it('ignora una respuesta anterior cuando se consulta otro evento', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([event, { ...event, eventId: 'ev-2', title: 'Teatro' }]);
  let resolveFirst!: (value: StationRecommendation) => void;
  vi.mocked(service.recommendation).mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }))
    .mockResolvedValueOnce({ ...result, message: 'Destino nuevo' });
  mount(); await screen.findByText('Teatro');
  const buttons = screen.getAllByRole('button', { name: 'Ver estación recomendada' });
  fireEvent.click(buttons[0]);
  expect(screen.getByText('Calculando una ruta segura…')).toBeInTheDocument();
  fireEvent.click(buttons[1]); await screen.findByText('Destino nuevo');
  await act(async () => { resolveFirst({ ...result, message: 'Respuesta obsoleta' }); });
  expect(screen.queryByText('Respuesta obsoleta')).not.toBeInTheDocument();
  expect(screen.getByText('Destino nuevo')).toBeInTheDocument();
});
it('actualizar descarta la recomendación si el evento ya no está disponible', async () => {
  vi.mocked(service.recommendation).mockResolvedValue(result); mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Ver estación recomendada' }));
  await screen.findByText('Estación Parque');
  vi.mocked(service.upcoming).mockResolvedValue([]);
  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
  await screen.findByText('Sin próximos eventos disponibles');
  expect(screen.queryByText('Estación Parque')).not.toBeInTheDocument();
});

it('muestra la demanda máxima recibida para un evento con cupo completo', async () => {
  vi.mocked(service.upcoming).mockResolvedValue([{ ...event, expectedDemand: 100 }]);
  mount();
  expect(await screen.findByText('Cupo completo')).toBeInTheDocument();
  expect(screen.getByText('Demanda de referencia: 100 asistentes')).toBeInTheDocument();
});
