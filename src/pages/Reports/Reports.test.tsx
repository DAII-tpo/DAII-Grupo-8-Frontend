import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { incidentService } from '../../services/incidents/incidentService';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import { mantineTheme } from '../../styles/theme';
import { ReportsPage } from './index';

vi.mock('../../config/currentUser', () => ({ currentUserId: 7 }));
vi.mock('../../services/incidents/incidentService', () => ({ incidentService: { getTypes: vi.fn(), report: vi.fn() } }));
vi.mock('../../services/stations/stationService', () => ({ stationService: { getNearby: vi.fn() } }));
vi.mock('../../services/trips/tripService', () => ({ tripService: { end: vi.fn(), getActive: vi.fn() } }));

const activeTrip = {
  id: 3,
  status: 'ACTIVE' as const,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  originStationId: 2,
  originStationName: 'Estacion Centro',
  destinationStationId: null,
  destinationStationName: null,
  startedAt: '2026-09-17T14:00:00Z',
  endedAt: null,
  durationSeconds: null,
};

const types = [
  { id: 2, code: 'FLAT_TIRE', name: 'Pinchazo', description: 'Rueda desinflada' },
  { id: 3, code: 'BRAKE_FAILURE', name: 'Falla de frenos', description: 'Frenos sin respuesta' },
];

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/movilidad/reportes']}>
      <MantineProvider theme={mantineTheme}>
        <Routes>
          <Route path="/movilidad/reportes" element={<ReportsPage />} />
        </Routes>
      </MantineProvider>
    </MemoryRouter>,
  );
}

function mockFormData() {
  vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);
  vi.mocked(incidentService.getTypes).mockResolvedValueOnce(types);
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
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
});

describe('ReportsPage', () => {
  it('carga los tipos reales y muestra la bicicleta del viaje activo', async () => {
    mockFormData();

    renderPage();

    expect(await screen.findByRole('combobox', { name: 'Tipo de problema' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pinchazo' })).toBeInTheDocument();
    expect(screen.getByText('Bicicleta en uso: BIKE-001')).toBeInTheDocument();
    expect(incidentService.getTypes).toHaveBeenCalledOnce();
    expect(tripService.getActive).toHaveBeenCalledWith(7);
  });

  it('requiere seleccionar un tipo y describir el problema', async () => {
    mockFormData();

    renderPage();

    const submit = await screen.findByRole('button', { name: 'Enviar reporte' });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    expect(screen.getByText('Rueda desinflada')).toBeInTheDocument();
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: '  Rueda trasera desinflada  ' } });
    expect(submit).toBeEnabled();
  });

  it('envía el reporte con el payload real y confirma la respuesta', async () => {
    mockFormData();
    vi.mocked(incidentService.report).mockResolvedValueOnce({
      id: 8,
      bikeId: 1,
      bikeCode: 'BIKE-001',
      reportedByUserId: 7,
      incidentTypeId: 2,
      incidentTypeCode: 'FLAT_TIRE',
      incidentTypeName: 'Pinchazo',
      description: 'Rueda trasera desinflada',
      status: 'OPEN',
      reportedAt: '2026-09-17T14:30:00Z',
    });

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: '  Rueda trasera desinflada  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText('Reporte enviado')).toBeInTheDocument();
    expect(incidentService.report).toHaveBeenCalledWith(7, {
      bikeId: 1,
      incidentTypeId: 2,
      description: 'Rueda trasera desinflada',
    });
    expect(screen.getByText('Pinchazo')).toBeInTheDocument();
  });

  it('sugiere la estación disponible más cercana y confirma la devolución', async () => {
    mockFormData();
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (success: PositionCallback) => success({ coords: { latitude: -34.6037, longitude: -58.3816 } } as GeolocationPosition) },
    });
    vi.mocked(incidentService.report).mockResolvedValueOnce({
      id: 8, bikeId: 1, bikeCode: 'BIKE-001', reportedByUserId: 7, incidentTypeId: 2,
      incidentTypeCode: 'FLAT_TIRE', incidentTypeName: 'Pinchazo', description: 'Rueda desinflada',
      status: 'OPEN', reportedAt: '2026-09-17T14:30:00Z',
    });
    vi.mocked(stationService.getNearby).mockResolvedValueOnce([{
      stationId: 4, stationName: 'Plaza Norte', address: 'Av. Norte 100', latitude: -34.6,
      longitude: -58.38, distanceMeters: 240, capacity: 20, availableBikes: 8, availableSlots: 12,
    }]);
    vi.mocked(tripService.end).mockResolvedValueOnce({
      ...activeTrip, status: 'COMPLETED', destinationStationId: 4, destinationStationName: 'Plaza Norte',
      endedAt: '2026-09-17T14:40:00Z', durationSeconds: 2400,
    });

    renderPage();
    fireEvent.change(await screen.findByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: 'Rueda desinflada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText('A 240 m · 12 espacios libres')).toBeInTheDocument();
    expect(stationService.getNearby).toHaveBeenCalledWith({ lat: -34.6037, lng: -58.3816, limit: 5 });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar que la dejé acá' }));

    expect(await screen.findByText('Confirmaste la devolución en Plaza Norte. El viaje quedó finalizado.')).toBeInTheDocument();
    expect(tripService.end).toHaveBeenCalledWith(7, 3, { destinationStationId: 4 });
  });

  it('evita el doble envío mientras el reporte está en progreso', async () => {
    mockFormData();
    const reportPromise = new Promise<Awaited<ReturnType<typeof incidentService.report>>>(() => {});
    vi.mocked(incidentService.report).mockReturnValueOnce(reportPromise);

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: 'Rueda desinflada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeDisabled();
    expect(incidentService.report).toHaveBeenCalledOnce();
  });

  it('mantiene el formulario usable si el backend rechaza el reporte', async () => {
    mockFormData();
    vi.mocked(incidentService.report).mockRejectedValueOnce(httpError(409));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: 'Rueda desinflada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText('Tu usuario no está habilitado para reportar incidencias.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Descripción' })).toHaveValue('Rueda desinflada');
    expect(screen.getByRole('button', { name: 'Enviar reporte' })).toBeEnabled();
  });

  it('explica que no se puede asociar una bicicleta sin viaje activo', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(null);
    vi.mocked(incidentService.getTypes).mockResolvedValueOnce(types);

    renderPage();

    expect(await screen.findByText('No tenés ningún viaje activo')).toBeInTheDocument();
    expect(screen.getByText('Asistencia durante el viaje')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar reporte' })).not.toBeInTheDocument();
  });

  it('permite reintentar cuando no se pueden cargar los datos iniciales', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip).mockResolvedValueOnce(activeTrip);
    vi.mocked(incidentService.getTypes).mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(types);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('combobox', { name: 'Tipo de problema' })).toBeInTheDocument();
    expect(incidentService.getTypes).toHaveBeenCalledTimes(2);
  });

  it('informa cuando el backend no devuelve tipos de incidencia activos', async () => {
    vi.mocked(tripService.getActive).mockResolvedValueOnce(activeTrip);
    vi.mocked(incidentService.getTypes).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('No hay tipos de incidencia disponibles')).toBeInTheDocument();
  });

  it.each([
    [400, 'Revisá el tipo de problema y la descripción antes de reenviar.'],
    [404, 'La bicicleta o el tipo seleccionado ya no están disponibles.'],
  ])('muestra un mensaje útil para el error HTTP %i', async (status, message) => {
    mockFormData();
    vi.mocked(incidentService.report).mockRejectedValueOnce(httpError(status));

    renderPage();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Tipo de problema' }), { target: { value: '2' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Descripción' }), { target: { value: 'Rueda desinflada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar reporte' }));

    expect(await screen.findByText(message)).toBeInTheDocument();
  });
});
