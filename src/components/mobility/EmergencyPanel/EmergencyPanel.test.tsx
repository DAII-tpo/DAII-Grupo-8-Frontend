import { MantineProvider } from '@mantine/core';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { emergencyService } from '../../../services/emergencies/emergencyService';
import { mantineTheme } from '../../../styles/theme';
import type { EmergencyResponse } from '../../../types/emergency';
import { EmergencyPanel } from './EmergencyPanel';

vi.mock('../../../services/emergencies/emergencyService', () => ({
  emergencyService: { cancel: vi.fn(), getCurrent: vi.fn(), report: vi.fn(), submitTriage: vi.fn() },
}));

const start = new Date('2026-10-29T22:00:00Z');

const trip = {
  id: 3,
  status: 'ACTIVE' as const,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  originStationId: 2,
  originStationName: 'Estacion Centro',
  destinationStationId: null,
  destinationStationName: null,
  startedAt: '2026-10-29T21:40:00Z',
  endedAt: null,
  durationSeconds: null,
};

const pending: EmergencyResponse = {
  id: 91,
  code: 'EMG-20261029-0091',
  status: 'PENDING',
  tripId: 3,
  bikeId: 1,
  bikeCode: 'BIKE-001',
  latitude: -34.6037,
  longitude: -58.3816,
  accuracyMeters: 12.4,
  reportedAt: '2026-10-29T22:00:00Z',
  cancelableUntil: '2026-10-29T22:00:10Z',
  triageDeadline: '2026-10-29T22:01:10Z',
  cancelWindowSeconds: 10,
  triageWindowSeconds: 60,
  canMove: null,
  bleeding: null,
  vehicleInvolved: null,
  priority: null,
  sentAt: null,
};

const reported: EmergencyResponse = { ...pending, status: 'REPORTED', priority: 'P2', sentAt: '2026-10-29T22:00:20Z' };

const getCurrentPosition = vi.fn<(success: PositionCallback, error?: PositionErrorCallback | null) => void>();
const onClose = vi.fn();
const onCancelled = vi.fn();
const onEmergencyChange = vi.fn();

function renderPanel(initialEmergency: EmergencyResponse | null = null) {
  return render(
    <MantineProvider theme={mantineTheme}>
      <EmergencyPanel
        initialEmergency={initialEmergency}
        onCancelled={onCancelled}
        onClose={onClose}
        onEmergencyChange={onEmergencyChange}
        trip={trip}
        userId={1}
      />
    </MantineProvider>,
  );
}

async function advance(milliseconds: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(milliseconds);
  });
}

async function holdSos(milliseconds = 2_000) {
  const button = screen.getByRole('button', { name: /SOS/ });
  fireEvent.pointerDown(button);
  await advance(milliseconds);
  fireEvent.pointerUp(button);
}

function httpError(status: number) {
  return Object.assign(new Error('Request failed'), { isAxiosError: true, response: { status } });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  vi.setSystemTime(start);
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
  getCurrentPosition.mockImplementation((success) => success({
    coords: { latitude: -34.6037, longitude: -58.3816, accuracy: 12.4 },
  } as GeolocationPosition));
  vi.mocked(emergencyService.report).mockResolvedValue(pending);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('EmergencyPanel', () => {
  it('no pide ayuda si se suelta el SOS antes de los 2 segundos', async () => {
    renderPanel();

    await holdSos(1_500);

    expect(emergencyService.report).not.toHaveBeenCalled();
    expect(screen.getByText('Mantené presionado 2 s para pedir ayuda')).toBeInTheDocument();
  });

  it('al mantener presionado manda la ubicación del navegador y abre la ventana para cancelar', async () => {
    renderPanel();

    await holdSos();

    expect(emergencyService.report).toHaveBeenCalledWith(1, 3, {
      latitude: -34.6037,
      longitude: -58.3816,
      accuracyMeters: 12.4,
    });
    expect(onEmergencyChange).toHaveBeenCalledWith(pending);
    expect(screen.getByText('Pediste ayuda')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Viaje pausado sin cobro · BIKE-001 bloqueada', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Llamar al 911' })).toHaveAttribute('href', 'tel:911');

    await advance(3_000);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('cancelar dentro de la ventana avisa a la pantalla para retomar el viaje', async () => {
    vi.mocked(emergencyService.cancel).mockResolvedValueOnce({ ...pending, status: 'CANCELLED' });
    renderPanel();
    await holdSos();

    fireEvent.click(screen.getByRole('button', { name: 'Fue un error, cancelar' }));
    await advance(0);

    expect(emergencyService.cancel).toHaveBeenCalledWith(1, 91);
    expect(onCancelled).toHaveBeenCalledOnce();
  });

  it('sin ubicación no pide ayuda y ofrece llamar al 911', async () => {
    getCurrentPosition.mockImplementation((_success, error) => error?.({ code: 1 } as GeolocationPositionError));
    renderPanel();

    await holdSos();

    expect(emergencyService.report).not.toHaveBeenCalled();
    expect(screen.getByText(/No pudimos obtener tu ubicación/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Llamar al 911' })).toBeInTheDocument();
  });

  it('terminado el contador pide el cuestionario y con las tres respuestas avisa a Emergencias', async () => {
    vi.mocked(emergencyService.submitTriage).mockResolvedValueOnce(reported);
    renderPanel();
    await holdSos();

    await advance(10_000);
    expect(screen.getByText('¿Cómo estás?')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: 'Enviar respuestas' });
    expect(submit).toBeDisabled();

    const [canMove, bleeding, vehicle] = screen.getAllByRole('group');
    fireEvent.click(within(canMove).getByRole('button', { name: 'No' }));
    fireEvent.click(within(bleeding).getByRole('button', { name: 'No' }));
    fireEvent.click(within(vehicle).getByRole('button', { name: 'No' }));
    expect(screen.getByText('Prioridad sugerida: P2')).toBeInTheDocument();

    fireEvent.click(submit);
    await advance(0);

    expect(emergencyService.submitTriage).toHaveBeenCalledWith(1, 91, {
      canMove: false,
      bleeding: false,
      vehicleInvolved: false,
    });
    expect(screen.getByText('Alerta enviada a Emergencias')).toBeInTheDocument();
    expect(screen.getByText('Prioridad sugerida: P2')).toBeInTheDocument();
  });

  it('si vence el cuestionario espera a que el servidor avise igual', async () => {
    vi.mocked(emergencyService.getCurrent).mockResolvedValueOnce(pending).mockResolvedValue({ ...reported, priority: 'P1' });
    renderPanel();
    await holdSos();

    await advance(70_000);
    expect(screen.getByText('Avisando a Emergencias...')).toBeInTheDocument();

    await advance(6_000);
    expect(screen.getByText('Alerta enviada a Emergencias')).toBeInTheDocument();
    expect(screen.getByText('Prioridad sugerida: P1')).toBeInTheDocument();
  });

  it('si el servidor ya cerró el cuestionario pasa a esperar el aviso', async () => {
    vi.mocked(emergencyService.submitTriage).mockRejectedValueOnce(httpError(409));
    vi.mocked(emergencyService.getCurrent).mockResolvedValue(reported);
    renderPanel();
    await holdSos();
    await advance(10_000);

    for (const group of screen.getAllByRole('group')) {
      fireEvent.click(within(group).getByRole('button', { name: 'Sí' }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Enviar respuestas' }));
    await advance(0);
    expect(screen.getByText('Avisando a Emergencias...')).toBeInTheDocument();

    await advance(3_000);
    expect(screen.getByText('Alerta enviada a Emergencias')).toBeInTheDocument();
  });

  it('retoma una emergencia ya enviada al recargar la página', () => {
    renderPanel(reported);

    expect(screen.getByText('Alerta enviada a Emergencias')).toBeInTheDocument();
    expect(screen.getByText('Emergencia en curso')).toBeInTheDocument();
    expect(screen.getByText('EMG-20261029-0091')).toBeInTheDocument();
  });

  it('volver al viaje cierra el panel sin pedir ayuda', () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Volver al viaje' }));

    expect(onClose).toHaveBeenCalledOnce();
    expect(emergencyService.report).not.toHaveBeenCalled();
  });
});
