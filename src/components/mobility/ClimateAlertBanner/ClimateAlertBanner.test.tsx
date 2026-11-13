import { MantineProvider } from '@mantine/core';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { climateService } from '../../../services/climate/climateService';
import { mantineTheme } from '../../../styles/theme';
import { ClimateAlertBanner } from './ClimateAlertBanner';

vi.mock('../../../services/climate/climateService', () => ({ climateService: { getCurrent: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('muestra el aviso activo y aclara que las devoluciones siguen permitidas', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([{
    alertaId: 'weather-1', nivelCriticidad: 'ALTA', fenomeno: 'TORMENTA_FUERTE',
    barrios: ['Palermo'], vigenciaDesde: '2026-11-12T10:00:00Z',
    vigenciaHasta: '2026-11-13T10:00:00Z', activa: true,
  }]);
  render(<MantineProvider theme={mantineTheme}><ClimateAlertBanner /></MantineProvider>);
  expect(await screen.findByText(/Las devoluciones siguen permitidas/)).toBeInTheDocument();
  expect(climateService.getCurrent).toHaveBeenCalledOnce();
});

it('un fallo de alertas no bloquea el contenido de la pantalla', async () => {
  vi.mocked(climateService.getCurrent).mockRejectedValueOnce(new Error('offline'));
  render(<MantineProvider theme={mantineTheme}><ClimateAlertBanner /></MantineProvider>);
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
