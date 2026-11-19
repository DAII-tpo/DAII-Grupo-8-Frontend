import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { restockService, type RestockTask } from '../../services/restock/restockService';
import { RestockPanel } from './RestockPanel';

vi.mock('../../services/restock/restockService', () => ({
  restockService: { getUpcoming: vi.fn(), getTransferPlans: vi.fn() },
}));

const task: RestockTask = {
  id: 1, activityId: 'a', activityTitle: 'Festival activo', stationId: 1, stationName: 'Centro',
  distanceMeters: 50, deadline: '2030-11-18T20:00:00Z', capacity: 20, totalBikes: 3,
  availableBikes: 3, availableSlots: 17, targetBikes: 10, status: 'PENDING', resolution: null,
  resolvedAt: null,
};

function show(tasks: RestockTask[]) {
  vi.mocked(restockService.getUpcoming).mockResolvedValue(tasks);
  return render(<MantineProvider><RestockPanel /></MantineProvider>);
}

afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('Historial de actividades de reabastecimiento', () => {
  it('oculta canceladas del trabajo y conserva toda la actividad en el historial', async () => {
    show([task, {
      ...task, id: 2, activityId: 'b', activityTitle: 'Festival cancelado', stationName: 'Norte',
      activityChange: { state: 'CANCELADA', modifiedAt: '2026-11-18T12:00:00Z', reason: 'Lluvia' },
    }]);
    expect(await screen.findByRole('heading', { name: 'Festival activo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Festival cancelado' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por realizar (1)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Historial (1)' }));
    expect(screen.getByRole('heading', { name: 'Festival cancelado' })).toBeInTheDocument();
    expect(screen.getByText('Cancelada')).toBeInTheDocument();
    const details = screen.getByText('Ver estaciones de la actividad (1)').closest('details');
    expect(details).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Ver estaciones de la actividad (1)'));
    expect(details).toHaveAttribute('open');
    expect(within(details!).getByRole('heading', { name: 'Norte' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Marcar realizada' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Por realizar (1)' }));
    expect(screen.getByRole('heading', { name: 'Festival activo' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Festival cancelado' })).not.toBeInTheDocument();
  });

  it('cuenta una actividad por todas sus estaciones y conserva el detalle al buscar una estación', async () => {
    show([
      { ...task, status: 'COMPLETED', resolution: 'TARGET_REACHED' },
      { ...task, id: 2, stationId: 2, stationName: 'Norte', status: 'COMPLETED', resolution: 'MANUAL' },
    ]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Historial (1)' }));
    expect(screen.getByText('Realizada')).toBeInTheDocument();
    expect(screen.getByText('2 de 2 estaciones realizadas')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar por evento o estación'), { target: { value: 'norte' } });
    fireEvent.click(screen.getByText('Ver estaciones de la actividad (2)'));
    const stations = screen.getByRole('list', { name: 'Estaciones de Festival activo' });
    expect(within(stations).getByRole('heading', { name: 'Centro' })).toBeInTheDocument();
    expect(within(stations).getByRole('heading', { name: 'Norte' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar por evento o estación'), { target: { value: 'desconocido' } });
    expect(screen.getByText('No hay tareas para mostrar en esta sección.')).toBeInTheDocument();
  });

  it('conserva actividades parciales y suspendidas por realizar y clasifica vencidas por actividad', async () => {
    show([
      task,
      { ...task, id: 2, status: 'COMPLETED', resolution: 'MANUAL' },
      { ...task, id: 3, activityId: 'b', activityTitle: 'Festival suspendido',
        activityChange: { state: 'SUSPENDIDA', modifiedAt: '2026-11-18T12:00:00Z', reason: null } },
      { ...task, id: 4, activityId: 'c', activityTitle: 'Festival vencido', status: 'EXPIRED', resolution: 'EXPIRED' },
      { ...task, id: 5, activityId: 'c', activityTitle: 'Festival vencido', status: 'COMPLETED', resolution: 'MANUAL' },
    ]);
    expect(await screen.findByRole('heading', { name: 'Festival suspendido' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Historial (1)' }));
    expect(screen.getByRole('heading', { name: 'Festival vencido' })).toBeInTheDocument();
    expect(screen.getByText('No realizada')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Festival activo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Festival suspendido' })).not.toBeInTheDocument();
  });

  it('ignora estaciones de la cobertura anterior al evaluar si una actividad fue realizada', async () => {
    show([
      { ...task, status: 'COMPLETED', resolution: 'TARGET_REACHED' },
      { ...task, id: 2, stationName: 'Cobertura anterior', outsideCoverage: true, status: 'EXPIRED', resolution: 'OUTSIDE_COVERAGE' },
    ]);
    fireEvent.click(await screen.findByRole('tab', { name: 'Historial (1)' }));
    expect(screen.getByText('Realizada')).toBeInTheDocument();
    expect(screen.getByText('1 de 1 estaciones realizadas')).toBeInTheDocument();
    expect(screen.getByText('Ver estaciones de la actividad (2)')).toBeInTheDocument();
  });
});
