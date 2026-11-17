import { MantineProvider } from '@mantine/core';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import { climateService } from '../../../services/climate/climateService';
import { mantineTheme } from '../../../styles/theme';
import type { ClimateAlert } from '../../../types/climateAlert';
import { ClimateAlertBanner } from './ClimateAlertBanner';

vi.mock('../../../services/climate/climateService', () => ({ climateService: { getCurrent: vi.fn() } }));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

function alertOf(overrides: Partial<ClimateAlert>): ClimateAlert {
  return {
    alertaId: 'weather-1', nivelCriticidad: 'ALTA', fenomeno: 'TORMENTA_FUERTE',
    barrios: ['Palermo'], vigenciaDesde: '2026-11-12T10:00:00Z',
    vigenciaHasta: '2026-11-13T10:00:00Z', activa: true, accion: 'BLOQUEO', bloqueaAlquiler: true,
    ...overrides,
  };
}

function renderBanner() {
  render(<MantineProvider theme={mantineTheme}><ClimateAlertBanner /></MantineProvider>);
}

it('muestra el aviso activo y aclara que las devoluciones siguen permitidas', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([alertOf({})]);
  renderBanner();
  expect(await screen.findByText(/Las devoluciones siguen permitidas/)).toBeInTheDocument();
  expect(screen.getByText('Tormenta fuerte · nivel alta')).toBeInTheDocument();
  expect(screen.getByText('Alquiler bloqueado')).toBeInTheDocument();
  expect(climateService.getCurrent).toHaveBeenCalledOnce();
});

it('una tormenta eléctrica MEDIA bloquea el alquiler aunque el nivel no sea alto', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([alertOf({
    fenomeno: 'TORMENTA_ELECTRICA', nivelCriticidad: 'MEDIA', accion: 'BLOQUEO', bloqueaAlquiler: true,
  })]);
  renderBanner();
  expect(await screen.findByText('Alquiler bloqueado')).toBeInTheDocument();
  expect(screen.getByText(/No se pueden iniciar viajes desde estaciones de Palermo \(riesgo de rayos\)/)).toBeInTheDocument();
});

it('una lluvia intensa ALTA solo pide confirmar el riesgo', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([alertOf({
    fenomeno: 'LLUVIA_INTENSA', accion: 'CONFIRMACION', bloqueaAlquiler: false,
  })]);
  renderBanner();
  expect(await screen.findByText('Requiere confirmación')).toBeInTheDocument();
  expect(screen.getByText(/vas a tener que aceptar el riesgo climático/)).toBeInTheDocument();
  expect(screen.queryByText(/No se pueden iniciar viajes/)).not.toBeInTheDocument();
});

it('un aviso no menciona bloqueos ni confirmaciones', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([alertOf({
    fenomeno: 'OLA_DE_FRIO', accion: 'AVISO', bloqueaAlquiler: false,
  })]);
  renderBanner();
  expect(await screen.findByText(/Circulá con precaución en Palermo \(frío extremo\)/)).toBeInTheDocument();
  expect(screen.getByText('Aviso')).toBeInTheDocument();
});

it('marca las alertas programadas y habla en futuro', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([alertOf({ activa: false })]);
  renderBanner();
  expect(await screen.findByText('Programada')).toBeInTheDocument();
  expect(screen.getByText(/no se podrán iniciar viajes/)).toBeInTheDocument();
});

it('muestra primero las más restrictivas y agrupa el resto', async () => {
  vi.mocked(climateService.getCurrent).mockResolvedValueOnce([
    alertOf({ alertaId: 'a', fenomeno: 'OLA_DE_FRIO', accion: 'AVISO', bloqueaAlquiler: false }),
    alertOf({ alertaId: 'b', fenomeno: 'LLUVIA_INTENSA', accion: 'CONFIRMACION', bloqueaAlquiler: false }),
    alertOf({ alertaId: 'c', fenomeno: 'GRANIZO', accion: 'BLOQUEO_Y_AVISO_VIAJES', bloqueaAlquiler: true }),
  ]);
  renderBanner();
  const titles = await screen.findAllByText(/· nivel/);
  expect(titles[0]).toHaveTextContent('Granizo');
  expect(titles[1]).toHaveTextContent('Lluvia intensa');
  fireEvent.click(screen.getByRole('button', { name: 'Ver 1 alerta más' }));
  expect(await screen.findByRole('button', { name: 'Ver menos alertas' })).toBeInTheDocument();
});

it('un fallo de alertas no bloquea el contenido de la pantalla', async () => {
  vi.mocked(climateService.getCurrent).mockRejectedValueOnce(new Error('offline'));
  renderBanner();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
