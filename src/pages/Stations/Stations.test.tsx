import { MantineProvider } from '@mantine/core';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { stationService } from '../../services/stations/stationService';
import { mantineTheme } from '../../styles/theme';
import { StationsPage } from './index';

vi.mock('../../services/stations/stationService', () => ({
  stationService: {
    getAll: vi.fn(),
  },
}));

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
      {
        id: 1,
        name: 'Estacion Centro',
        address: 'Av. Corrientes 100',
        latitude: -34.6037,
        longitude: -58.3816,
        capacity: 20,
        status: 'ACTIVE',
        createdAt: '2026-09-01T12:00:00Z',
        updatedAt: '2026-09-01T12:00:00Z',
        deletedAt: null,
      },
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
});
