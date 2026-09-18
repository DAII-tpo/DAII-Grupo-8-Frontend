import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { incidentService } from '../../services/incidents/incidentService';
import { maintenanceService } from '../../services/maintenance/maintenanceService';
import { mantineTheme } from '../../styles/theme';
import { AdministrationPage } from './index';

vi.mock('../../config/currentUser', () => ({ currentUserId: 7 }));
vi.mock('../../services/incidents/incidentService', () => ({ incidentService: { getAll: vi.fn(), updateStatus: vi.fn() } }));
vi.mock('../../services/maintenance/maintenanceService', () => ({ maintenanceService: { getAll: vi.fn(), create: vi.fn(), complete: vi.fn() } }));
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

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdministrationPage', () => {
  it('carga incidencias reales y mantiene activa la navegación de Administración', async () => {
    mockData();

    renderPage();

    expect(await screen.findByText('Rueda desinflada')).toBeInTheDocument();
    expect(screen.getByText('user@citypass.com')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Administracion' })).toHaveAttribute('data-active', 'true');
    expect(incidentService.getAll).toHaveBeenCalledWith(7);
    expect(maintenanceService.getAll).toHaveBeenCalledWith(7);
  });

  it('muestra un estado vacío para incidencias', async () => {
    vi.mocked(incidentService.getAll).mockResolvedValueOnce([]);
    vi.mocked(maintenanceService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(await screen.findByText('No hay incidencias registradas.')).toBeInTheDocument();
  });

  it('actualiza visualmente el estado de una incidencia', async () => {
    mockData();
    vi.mocked(incidentService.updateStatus).mockResolvedValueOnce({ ...incident, status: 'UNDER_REVIEW' });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'En revisión' }));

    expect(await screen.findByText('El estado de la incidencia fue actualizado.')).toBeInTheDocument();
    expect(incidentService.updateStatus).toHaveBeenCalledWith(7, 8, { status: 'UNDER_REVIEW' });
    expect(screen.getByText('En revisión')).toBeInTheDocument();
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
    expect(maintenanceService.create).toHaveBeenCalledWith(7, {
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
    expect(maintenanceService.complete).toHaveBeenCalledWith(7, 3, { resolution: 'Rueda reparada' });
    expect(screen.getByText('Completado')).toBeInTheDocument();
  });

  it('mantiene los datos visibles si falla una actualización', async () => {
    mockData();
    vi.mocked(incidentService.updateStatus).mockRejectedValueOnce(httpError(409));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'En revisión' }));

    expect(await screen.findByText('La operación no puede realizarse con el estado actual.')).toBeInTheDocument();
    expect(screen.getByText('Rueda desinflada')).toBeInTheDocument();
  });

  it('mantiene accesibles las tabs de incidencias, mantenimiento, estaciones y bicicletas', async () => {
    mockData();
    renderPage();

    await screen.findByText('Rueda desinflada');
    expect(screen.getByRole('tab', { name: 'Incidencias' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mantenimiento' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('tab', { name: 'Estaciones' })[1]);
    expect(screen.getByText('Gestión de estaciones')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Bicicletas' }));
    expect(screen.getByText('Gestión de bicicletas')).toBeInTheDocument();
  });
});
