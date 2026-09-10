import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { StationsPage } from './index';

vi.mock('../../services/stations/stationService', () => ({
  stationService: {
    getAll: vi.fn(),
    getAvailability: vi.fn(),
  },
}));

const station = {
  id: 1,
  name: 'Estacion Centro',
  address: 'Av. Corrientes 100',
  latitude: -34.6037,
  longitude: -58.3816,
  capacity: 20,
  status: 'ACTIVE' as const,
  createdAt: '2026-09-01T12:00:00Z',
  updatedAt: '2026-09-01T12:00:00Z',
  deletedAt: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MantineProvider theme={mantineTheme}>
      <StationsPage />
    </MantineProvider>,
  );
}

describe('StationsPage', () => {
  it('muestra el estado vacío cuando la API no devuelve estaciones', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([]);

    renderPage();

    expect(screen.getByText('Cargando estaciones...')).toBeInTheDocument();
    expect(await screen.findByText('No hay estaciones registradas')).toBeInTheDocument();
  });

  it('muestra las estaciones recibidas desde el servicio', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([
      station,
    ]);

    renderPage();

    expect(await screen.findByText('Estacion Centro')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('muestra un error si falla la consulta', async () => {
    vi.mocked(stationService.getAll).mockRejectedValueOnce(new Error('Network error'));

    renderPage();

    expect(await screen.findByText('No se pudieron cargar las estaciones')).toBeInTheDocument();
  });

  it('consulta y muestra la disponibilidad de la estación seleccionada', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      stationId: 1,
      stationName: 'Estacion Centro',
      status: 'ACTIVE',
      capacity: 20,
      availableBikes: 7,
      availableSlots: 13,
      checkedAt: '2026-09-08T14:30:00Z',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(stationService.getAvailability).toHaveBeenCalledWith(1);
    expect(await screen.findByText('Bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getByText('Última actualización: 2026-09-08T14:30:00Z')).toBeInTheDocument();
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('informa cuando la estación seleccionada no tiene bicicletas disponibles', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockResolvedValueOnce({
      stationId: 1,
      stationName: 'Estacion Centro',
      status: 'ACTIVE',
      capacity: 20,
      availableBikes: 0,
      availableSlots: 20,
      checkedAt: '2026-09-08T14:30:00Z',
    });

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(await screen.findByText('No hay bicicletas disponibles')).toBeInTheDocument();
    expect(screen.getByText('Esta estación no cuenta con bicicletas disponibles en este momento.')).toBeInTheDocument();
  });

  it('muestra un error si falla la consulta de disponibilidad', async () => {
    vi.mocked(stationService.getAll).mockResolvedValueOnce([station]);
    vi.mocked(stationService.getAvailability).mockRejectedValueOnce(new Error('Not found'));

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Consultar disponibilidad de Estacion Centro' }));

    expect(await screen.findByText('No se pudo consultar la disponibilidad')).toBeInTheDocument();
  });
});
