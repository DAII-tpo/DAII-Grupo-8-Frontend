import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { tripService } from '../../services/trips/tripService';
import { mantineTheme } from '../../styles/theme';
import { HistoryPage } from './index';

vi.mock('../../config/currentUser', () => ({ currentUserId: 7 }));
vi.mock('../../services/trips/tripService', () => ({ tripService: { getHistory: vi.fn() } }));

const trip = { id: 3, status: 'COMPLETED' as const, bikeId: 1, bikeCode: 'BIKE-001', originStationId: 2, originStationName: 'Plaza Norte', destinationStationId: 4, destinationStationName: 'Parque Sur', startedAt: '2026-09-17T14:00:00Z', endedAt: '2026-09-17T15:05:00Z', durationSeconds: 3900 };
const firstPage = { content: [trip], page: 0, size: 10, totalElements: 11, totalPages: 2, last: false };

function renderPage() { return render(<MemoryRouter initialEntries={['/movilidad/historial']}><MantineProvider theme={mantineTheme}><HistoryPage /></MantineProvider></MemoryRouter>); }
function httpError(status: number) { return Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status } }); }

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('HistoryPage', () => {
  it('muestra viajes reales, origen, destino y duración', async () => {
    vi.mocked(tripService.getHistory).mockResolvedValueOnce(firstPage);
    renderPage();
    expect(await screen.findByText(/Plaza Norte/)).toBeInTheDocument();
    expect(screen.getByText('Parque Sur', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('1 h 05 min')).toHaveLength(2);
    expect(screen.getByText('Completado')).toBeInTheDocument();
    expect(screen.getByText('17 de septiembre de 2026')).toBeInTheDocument();
    expect(screen.getByText('11:00 hs')).toBeInTheDocument();
    expect(screen.getByText('12:05 hs')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('data-active', 'true');
    expect(tripService.getHistory).toHaveBeenCalledWith(7, 0, 10);
  });

  it('muestra el estado vacío para un usuario sin viajes', async () => {
    vi.mocked(tripService.getHistory).mockResolvedValueOnce({ ...firstPage, content: [], totalElements: 0, totalPages: 0, last: true });
    renderPage();
    expect(await screen.findByText('Todavía no tenés viajes finalizados.')).toBeInTheDocument();
  });

  it('permite reintentar después de un error', async () => {
    vi.mocked(tripService.getHistory).mockRejectedValueOnce(httpError(404)).mockResolvedValueOnce(firstPage);
    renderPage();
    expect(await screen.findByText('No se encontró el usuario.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText(/Plaza Norte/)).toBeInTheDocument();
    expect(tripService.getHistory).toHaveBeenCalledTimes(2);
  });

  it('cambia de página usando la metadata real', async () => {
    vi.mocked(tripService.getHistory).mockResolvedValueOnce(firstPage).mockResolvedValueOnce({ ...firstPage, content: [{ ...trip, id: 2, originStationName: 'Centro', destinationStationName: 'Oeste' }], page: 1, last: true });
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Siguiente' }));
    expect(await screen.findByText(/Centro/)).toBeInTheDocument();
    expect(tripService.getHistory).toHaveBeenLastCalledWith(7, 1, 10);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  });
});
