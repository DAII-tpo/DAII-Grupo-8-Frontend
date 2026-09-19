import { Badge, Button, Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { tripService } from '../../services/trips/tripService';
import type { PagedResponse } from '../../types/pagination';
import type { TripResponse } from '../../types/trip';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './History.module.css';

const pageSize = 10;

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

  return <Stack className={pageClasses.page} gap="lg"><MobilityPageHeader title="Historial" subtitle="Revisá tus viajes finalizados y el detalle de cada recorrido." /><MobilityNavigation />{isLoading ? <LoadingState /> : null}{error ? <ErrorState message={error} onRetry={() => void loadHistory(page)} /> : null}{!isLoading && !error && history?.content.length === 0 ? <EmptyState /> : null}{!isLoading && !error && history && history.content.length > 0 ? <><Stack gap="sm">{history.content.map((trip) => <TripCard key={trip.id} trip={trip} />)}</Stack><Group justify="space-between"><Button disabled={history.page === 0} leftSection={<ChevronLeft size={16} />} onClick={() => setPage((current) => current - 1)} variant="default">Anterior</Button><Text c="dimmed" size="sm">Página {history.page + 1} de {Math.max(history.totalPages, 1)}</Text><Button disabled={history.last} onClick={() => setPage((current) => current + 1)} rightSection={<ChevronRight size={16} />}>Siguiente</Button></Group></> : null}</Stack>;
}

function LoadingState() { return <Paper className={classes.statePanel} radius="md" p="xl"><Stack align="center"><Loader color="citypassUrbanBlue" /><Text c="dimmed">Cargando tus viajes...</Text></Stack></Paper>; }
function EmptyState() { return <Paper className={classes.statePanel} radius="md" p="xl"><Text c="dimmed">Todavía no tenés viajes finalizados.</Text></Paper>; }
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) { return <RetryErrorAlert message={message} onRetry={onRetry} title="No se pudo cargar el historial" />; }
function TripCard({ trip }: { trip: TripResponse }) { return <Paper className={classes.tripCard} radius="md" p="md"><Group justify="space-between" wrap="wrap"><div><Title className={classes.tripTitle} order={2}>{trip.originStationName} <span aria-hidden="true">→</span> {trip.destinationStationName ?? 'Sin destino informado'}</Title><Text c="dimmed" size="sm">Inicio: {formatDateTime(trip.startedAt)}</Text></div><Badge color="citypassUrbanGreen">{trip.status}</Badge></Group><Group className={classes.metrics} mt="md"><Metric label="Bicicleta" value={trip.bikeCode} /><Metric label="Duración" value={formatDuration(trip.durationSeconds)} />{trip.endedAt ? <Metric label="Fin" value={formatDateTime(trip.endedAt)} /> : null}</Group></Paper>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><Text fw={700}>{value}</Text><Text c="dimmed" size="sm">{label}</Text></div>; }
function historyErrorMessage(error: unknown) { if (!isAxiosError(error)) return 'No pudimos cargar tus viajes. Intentá nuevamente.'; if (error.response?.status === 400) return 'La solicitud del historial no es válida.'; if (error.response?.status === 404) return 'No se encontró el usuario.'; return 'No pudimos cargar tus viajes. Intentá nuevamente.'; }
function formatDateTime(value: string) { return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
function formatDuration(seconds: number | null) { if (seconds === null) return 'Sin información'; if (seconds < 60) return `${seconds} s`; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min`; return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`; }
