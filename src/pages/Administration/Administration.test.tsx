import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bikeService } from '../../services/bikes/bikeService';
import { incidentService } from '../../services/incidents/incidentService';
import { maintenanceService } from '../../services/maintenance/maintenanceService';
import { restockService } from '../../services/restock/restockService';
import { stationService } from '../../services/stations/stationService';
import { analyticsService } from '../../services/analytics/analyticsService';
import { mantineTheme } from '../../styles/theme';
import { AdministrationPage } from './index';

vi.mock('../../app/providers/authContext', () => ({
  useAuth: () => ({ user: { email: 'staff@municipio.gob.ar', role: 'ADMIN', userId: 2 } }),
}));
vi.mock('../../services/incidents/incidentService', () => ({ incidentService: { getAll: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('../../services/maintenance/maintenanceService', () => ({ maintenanceService: { getAll: vi.fn(), create: vi.fn(), complete: vi.fn() } }));
vi.mock('../../services/stations/stationService', () => ({ stationService: { getAll: vi.fn() } }));
vi.mock('../../services/bikes/bikeService', () => ({ bikeService: { getAll: vi.fn(), getByStation: vi.fn() } }));
vi.mock('../../services/restock/restockService', () => ({ restockService: { getUpcoming: vi.fn(), getTransferPlans: vi.fn(), updateTarget: vi.fn(), complete: vi.fn() } }));
vi.mock('../../services/analytics/analyticsService', () => ({ analyticsService: { getEmbed: vi.fn() } }));
vi.mock('./StationManagement', () => ({ StationManagement: () => <div>Gestión de estaciones</div> }));
vi.mock('./BikeManagement', () => ({ BikeManagement: () => <div>Gestión de bicicletas</div> }));

const incident = {
  id: 8,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  reportedByUserId: 4,
  reportedByUserEmail: 'ana@example.com',
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
  vi.mocked(analyticsService.getEmbed).mockResolvedValue('<html><body>BI Dashboard</body></html>');
  vi.mocked(stationService.getAll).mockResolvedValue([]);
  vi.mocked(bikeService.getAll).mockResolvedValue([]);
  vi.mocked(bikeService.getByStation).mockResolvedValue([]);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdministrationPage', () => {
  it('muestra tareas de distintos eventos y permite buscarlas por evento o estación', async () => {
    mockData();
    vi.mocked(restockService.getUpcoming).mockResolvedValueOnce([
      { id: 1, activityId: 'festival', activityTitle: 'Festival de Recoleta', stationId: 9, stationName: 'Quintana', distanceMeters: 229, availableBikes: 7, totalBikes: 8, availableSlots: 2, capacity: 10, targetBikes: 9, coverageMeters: 500, status: 'PENDING', resolution: null, resolvedAt: null, deadline: '2026-11-13T00:22:00Z' },
      { id: 2, activityId: 'feria', activityTitle: 'Feria de Primavera', stationId: 15, stationName: 'Plaza de Mayo', distanceMeters: 150, availableBikes: 9, totalBikes: 9, availableSlots: 1, capacity: 10, targetBikes: 9, status: 'COMPLETED', resolution: 'STOCK_SUFFICIENT', resolvedAt: '2026-11-13T00:00:00Z', deadline: '2026-11-13T01:10:00Z' },
    ]);
    vi.mocked(restockService.getTransferPlans).mockResolvedValueOnce([{
      activityId: 'festival', plannedBikes: 1, remainingBikes: 1,
      transfers: [{
        source: { stationId: 8, stationName: 'Pasteur', totalBikes: 13, availableBikes: 12, minimumBikes: 10, transferableBikes: 2 },
        destinationId: 9, destinationName: 'Quintana', bikes: 1, distanceMeters: 525, sharedDestination: false,
      }],
    }]);
    vi.mocked(restockService.getTransferPlans).mockResolvedValueOnce([{
      activityId: 'festival', plannedBikes: 1, remainingBikes: 1, strategy: 'MODEL',
      transfers: [],
    }]);
    renderPage();

    const tab = await screen.findByRole('tab', { name: 'Reabastecimiento' });
    expect(restockService.getUpcoming).not.toHaveBeenCalled();
    fireEvent.click(tab);
    const stations = await screen.findByRole('list', { name: 'Estaciones de Festival de Recoleta' });
    expect(within(stations).getByRole('heading', { name: 'Quintana' })).toBeInTheDocument();
    expect(within(stations).getByText('8 en estación · 10 anclajes · 1 sin disponibilidad')).toBeInTheDocument();
    expect(within(stations).getByRole('progressbar', { name: '7 bicis disponibles de un objetivo de 9' })).toBeInTheDocument();
    expect(screen.getByText(/Radio de cobertura: 500 m/)).toBeInTheDocument();
    expect(within(stations).getByText('2 anclajes libres')).toBeInTheDocument();
    const targetName = 'Objetivo para Quintana';
    expect(within(stations).queryByLabelText(targetName)).not.toBeInTheDocument();
    fireEvent.click(within(stations).getByRole('button', { name: 'Editar objetivo' }));
    expect(within(stations).getByLabelText(targetName)).toHaveValue('9');
    fireEvent.click(within(stations).getByRole('button', { name: 'Cancelar' }));
    expect(within(stations).queryByLabelText(targetName)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver plan de traslados' }));
    const plan = screen.getByRole('region', { name: 'Plan de traslados' });
    expect(await within(plan).findByText('Pasteur')).toBeInTheDocument();
    expect(within(plan).getByText('13 en estación · 12 disponibles · mínimo 10')).toBeInTheDocument();
    expect(within(plan).getByText('Puede ceder 2')).toBeInTheDocument();
    expect(within(plan).getByText('1 sin cubrir')).toBeInTheDocument();
    fireEvent.click(within(plan).getByRole('button', { name: 'Evaluar orígenes con IA' }));
    expect(await within(plan).findByText(/El modelo ordenó los orígenes/)).toBeInTheDocument();
    expect(restockService.getTransferPlans).toHaveBeenLastCalledWith(expect.any(AbortSignal), true);
    const search = screen.getByRole('textbox', { name: 'Buscar por evento o estación' });
    fireEvent.change(search, { target: { value: 'feria' } });
    expect(screen.queryByText('Quintana')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Realizadas (1)' }));
    expect(screen.getByText('Plaza de Mayo')).toBeInTheDocument();
    expect(screen.getByText('Stock suficiente')).toBeInTheDocument();
  });

  it('muestra el aviso de Espacios y pausa las acciones de un evento suspendido', async () => {
    mockData();
    const task = {
      id: 1, activityId: 'festival', activityTitle: 'Festival de Recoleta', stationId: 9, stationName: 'Quintana',
      distanceMeters: 229, availableBikes: 7, totalBikes: 7, availableSlots: 3, capacity: 10, targetBikes: 9,
      status: 'PENDING' as const, resolution: null, resolvedAt: null, deadline: '2026-11-13T00:22:00Z',
      previousDeadline: '2026-11-12T23:22:00Z',
      deadlineChangedAt: '2026-11-12T22:50:00Z',
      activityChange: { state: 'SUSPENDIDA' as const, reason: 'Alerta meteorológica', modifiedAt: '2026-11-12T23:00:00Z' },
    };
    vi.mocked(restockService.getUpcoming).mockResolvedValueOnce([
      task, { ...task, id: 2, status: 'EXPIRED', resolution: 'EXPIRED' },
    ]);
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Reabastecimiento' }));
    expect(await screen.findByText('Evento suspendido')).toBeInTheDocument();
    expect(screen.getByText('Motivo: Alerta meteorológica')).toBeInTheDocument();
    expect(screen.getByText('Horario de cierre modificado')).toBeInTheDocument();
    expect(screen.getByText('Cierre anterior')).toBeVisible();
    expect(screen.getByText('Cierre nuevo')).toBeVisible();
    expect(screen.getByText(/Cambio registrado/).querySelector('time'))
      .toHaveAttribute('datetime', task.deadlineChangedAt);
    expect(screen.getByText('Tarea en pausa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar objetivo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver plan de traslados' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'No realizadas (1)' }));
    expect(screen.getByText(/Cambios del evento/).closest('details')).not.toHaveAttribute('open');
    expect(screen.getByText('Horario de cierre modificado')).not.toBeVisible();
  });

  it('guarda un objetivo válido y conserva la estación pendiente si falla la confirmación', async () => {
    mockData();
    const task = {
      id: 3, activityId: 'feria', activityTitle: 'Feria de Primavera', stationId: 15, stationName: 'Plaza de Mayo',
      distanceMeters: 150, availableBikes: 7, totalBikes: 10, availableSlots: 0, capacity: 10,
      targetBikes: 9, status: 'PENDING' as const, resolution: null, resolvedAt: null, deadline: '2026-11-13T01:10:00Z',
    };
    const updated = { ...task, targetBikes: 8 };
    vi.mocked(restockService.getUpcoming).mockResolvedValue([updated]).mockResolvedValueOnce([task]);
    vi.mocked(restockService.updateTarget).mockResolvedValueOnce(updated);
    vi.mocked(restockService.complete).mockRejectedValueOnce(httpError(500));

    renderPage();
    fireEvent.click(await screen.findByRole('tab', { name: 'Reabastecimiento' }));
    const stations = within(await screen.findByRole('list', { name: 'Estaciones de Feria de Primavera' }));
    expect(stations.getByText(/Sin lugar para recibir bicis/)).toBeInTheDocument();
    fireEvent.click(stations.getByRole('button', { name: 'Editar objetivo' }));
    const save = stations.getByRole('button', { name: 'Guardar objetivo' });
    expect(save).toBeDisabled();
    fireEvent.change(stations.getByLabelText('Objetivo para Plaza de Mayo'), { target: { value: '8' } });
    fireEvent.click(save);
    expect(await stations.findByText('Falta 1 bici')).toBeInTheDocument();
    expect(restockService.updateTarget).toHaveBeenCalledWith(3, 8);

    fireEvent.click(stations.getByRole('button', { name: 'Marcar realizada' }));
    expect(await stations.findByText(/No se pudo realizar la acción/)).toBeInTheDocument();
    expect(restockService.complete).toHaveBeenCalledWith(3);
    expect(stations.getByText('Falta 1 bici')).toBeInTheDocument();
  });

  it('permite reintentar la carga de tareas desde la misma solapa', async () => {
    mockData();
    vi.mocked(restockService.getUpcoming)
      .mockRejectedValueOnce(httpError(404))
      .mockResolvedValueOnce([]);
    renderPage();

    fireEvent.click(await screen.findByRole('tab', { name: 'Reabastecimiento' }));
    expect(await screen.findByText('El backend configurado todavía no ofrece el listado de reabastecimiento.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('No hay tareas de reabastecimiento.')).toBeInTheDocument();
  });

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
    vi.mocked(bikeService.getAll).mockResolvedValueOnce([{
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
    }, {
      id: 2,
      code: 'BIKE-002',
      stationId: null,
      stationName: null,
      status: 'IN_USE',
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
    expect(within(screen.getByRole('img', { name: 'Distribución de bicicletas por estado' })).getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1 / 20')).toBeInTheDocument();
    expect(incidentService.getAll).toHaveBeenCalledTimes(1);
    expect(maintenanceService.getAll).toHaveBeenCalledTimes(1);
    expect(stationService.getAll).toHaveBeenCalledTimes(1);
    expect(bikeService.getAll).toHaveBeenCalledTimes(1);
    expect(bikeService.getByStation).not.toHaveBeenCalled();
  });

  it('muestra el error general y permite reintentar si falla la carga global de bicicletas', async () => {
    mockData();
    vi.mocked(bikeService.getAll).mockRejectedValueOnce(httpError(500));

    renderPage();

    expect(await screen.findByText('No se pudo cargar la administración')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
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
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Administración de Movilidad' })).toBeInTheDocument();
    expect(incidentService.getAll).toHaveBeenCalledWith();
    expect(maintenanceService.getAll).toHaveBeenCalledWith();
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
    expect(incidentService.updateStatus).toHaveBeenCalledWith(8, { status: 'UNDER_REVIEW' });
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
    expect(maintenanceService.create).toHaveBeenCalledWith({
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
    expect(maintenanceService.complete).toHaveBeenCalledWith(3, { resolution: 'Rueda reparada' });
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

  it('carga el embed autenticado de BI en la pestaña Analítica administrativa', async () => {
    mockData();
    renderPage();

    await screen.findByRole('img', { name: 'Estado de incidencias' });

    const initialRequestCounts = {
      bikes: vi.mocked(bikeService.getAll).mock.calls.length,
      incidents: vi.mocked(incidentService.getAll).mock.calls.length,
      maintenance: vi.mocked(maintenanceService.getAll).mock.calls.length,
      stations: vi.mocked(stationService.getAll).mock.calls.length,
    };

    fireEvent.click(screen.getByRole('tab', { name: 'Analítica' }));

    const frame = await screen.findByTitle('Dashboard de Analítica de Movilidad');
    expect(frame).toHaveAttribute('srcdoc', '<html><body>BI Dashboard</body></html>');
    expect(frame).toHaveAttribute('sandbox', 'allow-scripts');
    expect(analyticsService.getEmbed).toHaveBeenCalledOnce();
    expect(vi.mocked(bikeService.getAll).mock.calls).toHaveLength(initialRequestCounts.bikes);
    expect(vi.mocked(incidentService.getAll).mock.calls).toHaveLength(initialRequestCounts.incidents);
    expect(vi.mocked(maintenanceService.getAll).mock.calls).toHaveLength(initialRequestCounts.maintenance);
    expect(vi.mocked(stationService.getAll).mock.calls).toHaveLength(initialRequestCounts.stations);
  });
});
