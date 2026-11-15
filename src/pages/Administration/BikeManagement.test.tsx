import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bikeService } from '../../services/bikes/bikeService';
import { restockService } from '../../services/restock/restockService';
import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { BikeManagement } from './BikeManagement';

vi.mock('../../services/bikes/bikeService', () => ({ bikeService: { changeStatus: vi.fn(), create: vi.fn(), getAvailable: vi.fn(), getByStation: vi.fn(), remove: vi.fn(), transfer: vi.fn(), transferForRestock: vi.fn() } }));
vi.mock('../../services/restock/restockService', () => ({ restockService: { getUpcoming: vi.fn(), getTransferPlans: vi.fn() } }));
vi.mock('../../services/stations/stationService', () => ({ stationService: { getAll: vi.fn() } }));
const stations = [{ id: 2, name: 'Centro', address: '', latitude: 0, longitude: 0, capacity: 10, status: 'ACTIVE' as const, createdAt: '', updatedAt: '', deletedAt: null }, { id: 3, name: 'Norte', address: '', latitude: 0, longitude: 0, capacity: 10, status: 'ACTIVE' as const, createdAt: '', updatedAt: '', deletedAt: null }];
const bike = { id: 1, code: 'B-1', stationId: 2, stationName: 'Centro', status: 'AVAILABLE' as const, model: null, purchaseDate: null, lastMaintenanceAt: null, createdAt: '', updatedAt: '' };
function renderPage() { return render(<MantineProvider theme={mantineTheme}><BikeManagement /></MantineProvider>); }
function error(status: number, message?: string) { return Object.assign(new Error('x'), { isAxiosError: true, response: { status, data: message ? { message } : undefined } }); }
afterEach(() => { cleanup(); vi.resetAllMocks(); });
describe('BikeManagement', () => {
  it('carga estaciones, muestra los estados en español y filtra localmente', async () => { vi.mocked(stationService.getAll).mockResolvedValueOnce(stations); vi.mocked(bikeService.getByStation).mockResolvedValueOnce([bike, { ...bike, id: 2, code: 'B-2', status: 'MAINTENANCE' }]); renderPage(); expect((await screen.findAllByRole('option', { name: 'Disponible' })).length).toBeGreaterThan(0); expect(screen.getAllByRole('option', { name: 'Fuera de servicio' }).length).toBeGreaterThan(0); fireEvent.change(screen.getByLabelText('Estación para bicicletas'), { target: { value: '2' } }); expect(await screen.findByText('B-1')).toBeInTheDocument(); expect(screen.getAllByText('Disponible').length).toBeGreaterThan(0); fireEvent.change(screen.getByLabelText('Filtro de estado'), { target: { value: 'MAINTENANCE' } }); expect(screen.queryByText('B-1')).not.toBeInTheDocument(); expect(screen.getByText('B-2')).toBeInTheDocument(); expect(screen.getAllByText('En mantenimiento').length).toBeGreaterThan(0); });
  it('crea, cambia estado y elimina después de confirmación', async () => { vi.mocked(stationService.getAll).mockResolvedValue(stations); vi.mocked(bikeService.getByStation).mockResolvedValue([bike]); vi.mocked(bikeService.create).mockResolvedValueOnce({ ...bike, id: 4, code: 'B-4' }); vi.mocked(bikeService.changeStatus).mockResolvedValueOnce({ ...bike, status: 'MAINTENANCE' }); vi.mocked(bikeService.remove).mockResolvedValueOnce(); renderPage(); fireEvent.change(await screen.findByLabelText('Estación para bicicletas'), { target: { value: '2' } }); await screen.findByText('B-1'); fireEvent.change(screen.getByLabelText('Código'), { target: { value: 'B-4' } }); fireEvent.click(screen.getByRole('button', { name: 'Crear bicicleta' })); expect(await screen.findByText('La bicicleta fue creada.')).toBeInTheDocument(); fireEvent.change(screen.getByLabelText('Cambiar estado B-1'), { target: { value: 'MAINTENANCE' } }); await waitFor(() => expect(bikeService.changeStatus).toHaveBeenCalledWith(1, { status: 'MAINTENANCE', reason: null })); await screen.findByText('El estado de la bicicleta fue actualizado.'); fireEvent.click(screen.getAllByRole('button', { name: 'Baja' })[0]); fireEvent.click(screen.getByRole('button', { name: 'Confirmar baja' })); await waitFor(() => expect(bikeService.remove).toHaveBeenCalledWith(1)); });
  it('traslada una bicicleta usando el selector de estaciones', async () => { vi.mocked(stationService.getAll).mockResolvedValue(stations); vi.mocked(bikeService.getByStation).mockResolvedValue([bike]); vi.mocked(bikeService.transfer).mockResolvedValue({ ...bike, stationId: 3 }); renderPage(); fireEvent.change(await screen.findByLabelText('Estación para bicicletas'), { target: { value: '2' } }); await screen.findByText('B-1'); fireEvent.change(screen.getByLabelText('Trasladar B-1'), { target: { value: '3' } }); await waitFor(() => expect(bikeService.transfer).toHaveBeenCalledWith(1, { stationId: 3 })); expect(await screen.findByText('La bicicleta fue trasladada.')).toBeInTheDocument(); });
  it('asocia el traslado a la tarea de la estación receptora', async () => {
    vi.mocked(stationService.getAll).mockResolvedValue(stations);
    vi.mocked(bikeService.getByStation).mockResolvedValue([bike]);
    vi.mocked(bikeService.transfer).mockResolvedValue({ ...bike, stationId: 3 });
    vi.mocked(restockService.getUpcoming).mockResolvedValue([{
      id: 17, activityId: 'festival', activityTitle: 'Feria', stationId: 3, stationName: 'Norte',
      distanceMeters: 80, deadline: '2026-11-17T00:00:00Z', capacity: 10, totalBikes: 3,
      availableBikes: 3, availableSlots: 7, targetBikes: 9, status: 'PENDING',
      resolution: null, resolvedAt: null,
    }]);

    renderPage();
    await screen.findAllByRole('option', { name: 'Centro' });
    fireEvent.change(screen.getByLabelText('Estación para bicicletas'), { target: { value: '2' } });
    const transfer = await screen.findByLabelText('Trasladar B-1');
    fireEvent.click(screen.getByRole('button', { name: 'Cargar tareas de reabastecimiento' }));
    await screen.findByRole('option', { name: 'Feria · Norte' });
    fireEvent.change(screen.getByLabelText('Tarea de reabastecimiento (opcional)'), { target: { value: '17' } });
    fireEvent.change(transfer, { target: { value: '3' } });

    await waitFor(() => expect(bikeService.transfer).toHaveBeenCalledWith(1, { stationId: 3, restockTaskId: 17 }));
    expect(await screen.findByText('La bicicleta fue trasladada para el evento.')).toBeInTheDocument();
  });
  it('confirma solamente las bicis seleccionadas y vuelve a consultar el plan', async () => {
    vi.mocked(stationService.getAll).mockResolvedValue(stations);
    vi.mocked(restockService.getUpcoming).mockResolvedValue([{
      id: 17, activityId: 'festival', activityTitle: 'Feria', stationId: 3, stationName: 'Norte',
      distanceMeters: 80, deadline: '2026-11-17T00:00:00Z', capacity: 10, totalBikes: 3,
      availableBikes: 3, availableSlots: 7, targetBikes: 9, status: 'PENDING',
      resolution: null, resolvedAt: null,
    }]);
    vi.mocked(restockService.getTransferPlans).mockResolvedValueOnce([{
      activityId: 'festival', plannedBikes: 2, remainingBikes: 4,
      transfers: [{
        source: { stationId: 2, stationName: 'Centro', totalBikes: 12, availableBikes: 12, minimumBikes: 10, transferableBikes: 2 },
        destinationId: 3, destinationName: 'Norte', bikes: 2, distanceMeters: 100, sharedDestination: false,
      }],
    }]).mockResolvedValueOnce([]);
    vi.mocked(bikeService.getAvailable).mockResolvedValue([bike, { ...bike, id: 2, code: 'B-2' }]);
    vi.mocked(bikeService.transferForRestock).mockResolvedValue([{ ...bike, stationId: 3 }]);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar planes de traslado' }));
    fireEvent.change(await screen.findByLabelText('Actividad'), { target: { value: 'festival' } });
    expect(screen.getByText('Centro → Norte')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completar traslado' }));
    expect(await screen.findByRole('checkbox', { name: 'B-1' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Registrar traslado' })).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'B-1' }));
    expect(screen.getByText('1 de 2 seleccionadas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar traslado' }));

    expect(await screen.findByText('Se registró el traslado de 1 bici.')).toBeInTheDocument();
    expect(bikeService.transferForRestock).toHaveBeenCalledWith({
      sourceStationId: 2, destinationStationId: 3, restockTaskId: 17, bikeIds: [1],
    });
    expect(restockService.getTransferPlans).toHaveBeenCalledTimes(2);
  });

  it('conserva la lista y muestra el mensaje de conflicto al fallar un cambio de estado', async () => { vi.mocked(stationService.getAll).mockResolvedValue(stations); vi.mocked(bikeService.getByStation).mockResolvedValue([bike]); vi.mocked(bikeService.changeStatus).mockRejectedValue(error(409, 'La bicicleta está en uso.')); renderPage(); fireEvent.change(await screen.findByLabelText('Estación para bicicletas'), { target: { value: '2' } }); await screen.findByText('B-1'); fireEvent.change(screen.getByLabelText('Cambiar estado B-1'), { target: { value: 'MAINTENANCE' } }); expect(await screen.findByText('La bicicleta está en uso.')).toBeInTheDocument(); expect(screen.getByText('B-1')).toBeInTheDocument(); });
});
