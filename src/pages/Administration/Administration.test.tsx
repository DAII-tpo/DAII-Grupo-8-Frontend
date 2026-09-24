import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bikeService } from '../../services/bikes/bikeService';
import { incidentService } from '../../services/incidents/incidentService';
import { maintenanceService } from '../../services/maintenance/maintenanceService';
import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { AdministrationPage } from './index';

vi.mock('../../app/providers/authContext', () => ({
  useAuth: () => ({ user: { email: 'admin@citypass.com', role: 'ADMIN', userId: 2 } }),
}));
vi.mock('../../services/incidents/incidentService', () => ({ incidentService: { getAll: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('../../services/maintenance/maintenanceService', () => ({ maintenanceService: { getAll: vi.fn(), create: vi.fn(), complete: vi.fn() } }));
vi.mock('../../services/stations/stationService', () => ({ stationService: { getAll: vi.fn() } }));
vi.mock('../../services/bikes/bikeService', () => ({ bikeService: { getByStation: vi.fn() } }));
vi.mock('./StationManagement', () => ({ StationManagement: () => <div>Gestión de estaciones</div> }));
vi.mock('./BikeManagement', () => ({ BikeManagement: () => <div>Gestión de bicicletas</div> }));

const incident = {
  id: 8,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  reportedByUserId: 4,
  reportedByUserEmail: 'user@citypass.com',
  incidentTypeId: 2,
  incidentTypeCode: 'FLAT_TIRE',
  incidentTypeName: 'Pinchazo',
  description: 'Rueda desinflada',
  status: 'OPEN' as const,
  reportedAt: '2026-09-17T14:30:00Z',
  resolvedAt: null,
  resolvedByUserId: null,
};

const maintenance = {
  id: 3,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  incidentId: 8,
  createdByUserId: 7,
  description: 'Revisar rueda',
  status: 'IN_PROGRESS' as const,
  startedAt: '2026-09-17T14:30:00Z',
  completedAt: null,
  resolution: null,
};

function renderPage() {
  return render(<MemoryRouter initialEntries={['/movilidad/administracion']}><MantineProvider theme={mantineTheme}><AdministrationPage /></MantineProvider></MemoryRouter>);
}

function mockData() {
  vi.mocked(incidentService.getAll).mockResolvedValueOnce([incident]);
  vi.mocked(maintenanceService.getAll).mockResolvedValueOnce([maintenance]);
}

function httpError(status: number) {
  return Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status } });
}

beforeEach(() => {
  vi.mocked(stationService.getAll).mockResolvedValue([]);
  vi.mocked(bikeService.getByStation).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdministrationPage', () => {
  it('construye los gráficos administrativos con estaciones y bicicletas reales', async () => {
    mockData();
    vi.mocked(stationService.getAll).mockResolvedValueOnce([{
      id: 2,
      name: 'Estacion Centro',
      address: 'Av. Corrientes 100',
      latitude: -34.6037,
      longitude: -58.3816,
      capacity: 20,
      status: 'ACTIVE',
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
      deletedAt: null,
    }]);
    vi.mocked(bikeService.getByStation).mockResolvedValueOnce([{
      id: 1,
      code: 'BIKE-001',
      stationId: 2,
      stationName: 'Estacion Centro',
      status: 'AVAILABLE',
      model: null,
      purchaseDate: null,
      lastMaintenanceAt: null,
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
    }]);

    renderPage();

    expect(await screen.findByRole('img', { name: 'Estado de incidencias' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Distribución de bicicletas por estado' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ocupación de estaciones' })).toBeInTheDocument();
    expect(bikeService.getByStation).toHaveBeenCalledWith(2);
  });

  it('permite buscar en la ocupación sin ocultar estaciones por cantidad', async () => {
    mockData();
    const stations = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      name: index === 9 ? 'Estación Décima' : `Estación ${index + 1}`,
      address: `Calle ${index + 1}`,
      latitude: -34.6,
      longitude: -58.38,
      capacity: 20,
      status: 'ACTIVE' as const,
      createdAt: '2026-09-01T12:00:00Z',
      updatedAt: '2026-09-01T12:00:00Z',
      deletedAt: null,
    }));
    vi.mocked(stationService.getAll).mockResolvedValueOnce(stations);

    renderPage();

    expect(await screen.findByText('10 de 10 estaciones')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar estación en ocupación' }), { target: { value: 'decima' } });
    expect(screen.getByText('1 de 10 estaciones')).toBeInTheDocument();
    expect(screen.getByText('Estación Décima')).toBeInTheDocument();
  });

  it('carga incidencias reales dentro de la administración de Movilidad', async () => {
    mockData();

    renderPage();

    expect(await screen.findByRole('img', { name: 'Estado de incidencias' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Incidencias' }));
    expect(await screen.findByText('Rueda desinflada')).toBeInTheDocument();
    expect(screen.getByText('user@citypass.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Administración de Movilidad' })).toBeInTheDocument();
    expect(incidentService.getAll).toHaveBeenCalledWith(2);
    expect(maintenanceService.getAll).toHaveBeenCalledWith(2);
  });

  it('muestra un estado vacío para incidencias', async () => {
    vi.mocked(incidentService.getAll).mockResolvedValueOnce([]);
    vi.mocked(maintenanceService.getAll).mockResolvedValueOnce([]);

    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });
    fireEvent.click(screen.getByRole('tab', { name: 'Incidencias' }));
    expect(await screen.findByText('No hay incidencias registradas.')).toBeInTheDocument();
  });

  it('actualiza visualmente el estado de una incidencia', async () => {
    mockData();
    vi.mocked(incidentService.updateStatus).mockResolvedValueOnce({ ...incident, status: 'UNDER_REVIEW' });

    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });
    fireEvent.click(screen.getByRole('tab', { name: 'Incidencias' }));
    fireEvent.click(await screen.findByRole('button', { name: 'En revisión' }));

    expect(await screen.findByText('El estado de la incidencia fue actualizado.')).toBeInTheDocument();
    expect(incidentService.updateStatus).toHaveBeenCalledWith(2, 8, { status: 'UNDER_REVIEW' });
    expect(screen.getAllByText('En revisión')).toHaveLength(2);
  });

  it('crea un mantenimiento asociado a una incidencia real', async () => {
    mockData();
    vi.mocked(maintenanceService.create).mockResolvedValueOnce({ ...maintenance, id: 4 });

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Mantenimiento' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Incidencia para mantenimiento' }), { target: { value: '8' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Detalle de mantenimiento' }), { target: { value: 'Revisar rueda' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar mantenimiento' }));

    expect(await screen.findByText('La bicicleta fue enviada a mantenimiento.')).toBeInTheDocument();
    expect(maintenanceService.create).toHaveBeenCalledWith(2, {
      bikeId: 1,
      incidentId: 8,
      description: 'Revisar rueda',
    });
  });

  it('finaliza un mantenimiento y conserva el resultado del backend', async () => {
    mockData();
    vi.mocked(maintenanceService.complete).mockResolvedValueOnce({
      ...maintenance,
      status: 'COMPLETED',
      completedAt: '2026-09-17T16:00:00Z',
      resolution: 'Rueda reparada',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Mantenimiento' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Resolución mantenimiento 3' }), { target: { value: 'Rueda reparada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar' }));

    expect(await screen.findByText('El mantenimiento fue finalizado.')).toBeInTheDocument();
    expect(maintenanceService.complete).toHaveBeenCalledWith(2, 3, { resolution: 'Rueda reparada' });
    expect(screen.getAllByText('Completado')).toHaveLength(2);
  });

  it('mantiene los datos visibles si falla una actualización', async () => {
    mockData();
    vi.mocked(incidentService.updateStatus).mockRejectedValueOnce(httpError(409));

    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });
    fireEvent.click(screen.getByRole('tab', { name: 'Incidencias' }));
    fireEvent.click(await screen.findByRole('button', { name: 'En revisión' }));

    expect(await screen.findByText('La operación no puede realizarse con el estado actual.')).toBeInTheDocument();
    expect(screen.getByText('Rueda desinflada')).toBeInTheDocument();
  });

  it('mantiene accesibles las tabs de incidencias, mantenimiento, estaciones y bicicletas', async () => {
    mockData();
    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });
    expect(screen.getByRole('tab', { name: 'Incidencias' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mantenimiento' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Estaciones' }));
    expect(screen.getByText('Gestión de estaciones')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Ocupación de estaciones' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Bicicletas' }));
    expect(screen.getByText('Gestión de bicicletas')).toBeInTheDocument();
  });

  it('muestra la analítica demostrativa sin realizar requests adicionales', async () => {
    mockData();
    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });

    const initialRequestCounts = {
      bikes: vi.mocked(bikeService.getByStation).mock.calls.length,
      incidents: vi.mocked(incidentService.getAll).mock.calls.length,
      maintenance: vi.mocked(maintenanceService.getAll).mock.calls.length,
      stations: vi.mocked(stationService.getAll).mock.calls.length,
    };

    fireEvent.click(screen.getByRole('tab', { name: 'Analítica' }));

    expect(await screen.findByText('Datos demostrativos')).toBeInTheDocument();
    expect(screen.getByText('Total de bicicletas')).toBeInTheDocument();
    expect(screen.getByText('Bicicletas por estación')).toBeInTheDocument();
    expect(screen.getByText('Viajes por hora')).toBeInTheDocument();
    expect(screen.getByText('Estaciones con mayor demanda')).toBeInTheDocument();
    expect(screen.getByText('Predicción de disponibilidad')).toBeInTheDocument();
    expect(screen.getByText('Alertas operativas')).toBeInTheDocument();
    expect(vi.mocked(bikeService.getByStation).mock.calls).toHaveLength(initialRequestCounts.bikes);
    expect(vi.mocked(incidentService.getAll).mock.calls).toHaveLength(initialRequestCounts.incidents);
    expect(vi.mocked(maintenanceService.getAll).mock.calls).toHaveLength(initialRequestCounts.maintenance);
    expect(vi.mocked(stationService.getAll).mock.calls).toHaveLength(initialRequestCounts.stations);
  });
});
