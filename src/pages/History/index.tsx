import { Badge, Button, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { Activity, Bike, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Flag, Play, Route } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityFeatureBanner } from '../../components/mobility/MobilityFeatureBanner';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { tripService } from '../../services/trips/tripService';
import type { PagedResponse } from '../../types/pagination';
import type { TripResponse } from '../../types/trip';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './History.module.css';

const pageSize = 10;
const argentinaTimeZone = 'America/Argentina/Buenos_Aires';
const tripStatusLabels: Record<TripResponse['status'], string> = {
  ACTIVE: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  INCIDENT: 'Con incidencia',
};

export function HistoryPage() {
  const userId = currentUserId;
  const [history, setHistory] = useState<PagedResponse<TripResponse> | null>(null);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (requestedPage: number) => {
    if (userId === null) {
      setError('No se encontró el usuario.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setHistory(await tripService.getHistory(userId, requestedPage, pageSize));
    } catch (requestError) {
      setError(historyErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => { void Promise.resolve().then(() => loadHistory(page)); }, [loadHistory, page]);

  return <Stack className={pageClasses.page} gap="lg"><MobilityPageHeader title="Historial" subtitle="Revisá tus viajes finalizados y el detalle de cada recorrido." /><MobilityNavigation /><MobilityFeatureBanner description="Consultá origen, destino, bicicleta y duración de cada viaje registrado en tu cuenta." icon={Activity} label="Tu actividad" title="Todos tus recorridos organizados" tone="amber" />{isLoading ? <LoadingState /> : null}{error ? <ErrorState message={error} onRetry={() => void loadHistory(page)} /> : null}{!isLoading && !error && history?.content.length === 0 ? <EmptyState /> : null}{!isLoading && !error && history && history.content.length > 0 ? <><HistorySummary history={history} /><Stack gap="sm">{history.content.map((trip) => <TripCard key={trip.id} trip={trip} />)}</Stack><Group justify="space-between"><Button disabled={history.page === 0} leftSection={<ChevronLeft size={16} />} onClick={() => setPage((current) => current - 1)} variant="default">Anterior</Button><Text c="dimmed" size="sm">Página {history.page + 1} de {Math.max(history.totalPages, 1)}</Text><Button disabled={history.last} onClick={() => setPage((current) => current + 1)} rightSection={<ChevronRight size={16} />}>Siguiente</Button></Group></> : null}</Stack>;
}

function HistorySummary({ history }: { history: PagedResponse<TripResponse> }) {
  const durations = history.content.map((trip) => trip.durationSeconds).filter((value): value is number => value !== null);
  const average = durations.length === 0 ? null : Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length);
  return (
    <Group className={classes.summaryPanel} gap="xl" wrap="wrap">
      <Metric icon={Route} label="Viajes registrados" value={String(history.totalElements)} />
      <Metric icon={CalendarDays} label="Mostrados en esta página" value={String(history.content.length)} />
      <Metric icon={Clock3} label="Duración promedio visible" value={formatDuration(average)} />
    </Group>
  );
}

function LoadingState() { return <Paper className={classes.statePanel} radius="md" p="xl"><Stack align="center"><Loader color="citypassUrbanBlue" /><Text c="dimmed">Cargando tus viajes...</Text></Stack></Paper>; }
function EmptyState() { return <Paper className={classes.statePanel} radius="md" p="xl"><Text c="dimmed">Todavía no tenés viajes finalizados.</Text></Paper>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <RetryErrorAlert message={message} onRetry={onRetry} title="No se pudo cargar el historial" />; }
function TripCard({ trip }: { trip: TripResponse }) {
  const isCompleted = trip.status === 'COMPLETED';
  return (
    <Paper className={classes.tripCard} radius="md" p="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="md" wrap="nowrap">
          <div className={classes.tripIcon}>{isCompleted ? <CheckCircle2 size={23} /> : <Route size={23} />}</div>
          <div>
            <Text className={classes.tripEyebrow}>VIAJE #{trip.id}</Text>
            <Title className={classes.tripTitle} order={2}>{trip.originStationName} <span aria-hidden="true">→</span> {trip.destinationStationName ?? 'Sin destino informado'}</Title>
            <Group className={classes.tripDate} gap={6} mt={3}>
              <CalendarDays size={14} />
              <Text size="sm">{formatDate(trip.startedAt)}</Text>
            </Group>
          </div>
        </Group>
        <Badge color={isCompleted ? 'citypassUrbanGreen' : 'citypassUrbanBlue'} size="lg" variant="light">{tripStatusLabels[trip.status]}</Badge>
      </Group>
      <Group className={classes.metrics} mt="md" wrap="wrap">
        <Metric icon={Bike} label="Bicicleta" value={trip.bikeCode} />
        <Metric icon={Clock3} label="Duración" value={formatDuration(trip.durationSeconds)} />
        <Metric icon={Play} label="Hora de inicio" value={formatTime(trip.startedAt)} />
        {trip.endedAt ? <Metric icon={Flag} label="Hora de finalización" value={formatTripEnd(trip.startedAt, trip.endedAt)} /> : null}
      </Group>
    </Paper>
  );
}

function Metric({ icon: Icon, label, value }: { icon?: typeof Activity; label: string; value: string }) {
  return <div className={classes.metric}>{Icon ? <Icon className={classes.metricIcon} size={17} /> : null}<div><Text fw={750}>{value}</Text><Text c="dimmed" size="xs">{label}</Text></div></div>;
}
function historyErrorMessage(error: unknown) { if (!isAxiosError(error)) return 'No pudimos cargar tus viajes. Intentá nuevamente.'; if (error.response?.status === 400) return 'La solicitud del historial no es válida.'; if (error.response?.status === 404) return 'No se encontró el usuario.'; return 'No pudimos cargar tus viajes. Intentá nuevamente.'; }
function formatDate(value: string) { return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: argentinaTimeZone }).format(new Date(value)); }
function formatTime(value: string) { return `${new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: argentinaTimeZone }).format(new Date(value))} hs`; }
function formatTripEnd(startedAt: string, endedAt: string) {
  return formatDate(startedAt) === formatDate(endedAt) ? formatTime(endedAt) : `${formatDate(endedAt)}, ${formatTime(endedAt)}`;
}
function formatDuration(seconds: number | null) { if (seconds === null) return 'Sin información'; if (seconds < 60) return `${seconds} s`; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min`; return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`; }
