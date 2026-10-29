import { Alert, Badge, Button, Group, Loader, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { CalendarDays, CircleAlert, MapPin, Navigation, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { culturalDestinationService } from '../../services/destinations/culturalDestinationService';
import type { CulturalDestination } from '../../types/culturalDestination';
import type { StationRecommendation } from '../../types/stationRecommendation';
import pageClasses from '../../styles/mobilityPage.module.css';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function CulturalDestinationsPage() {
  const [events, setEvents] = useState<CulturalDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<StationRecommendation | null>(null);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [recommendError, setRecommendError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await culturalDestinationService.upcoming();
      setEvents(result);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const viewRecommendation = async (eventId: string) => {
    setSelectedId(eventId);
    setRecommendation(null);
    setRecommendError(false);
    setRecommendLoading(true);
    try {
      setRecommendation(await culturalDestinationService.recommendation(eventId));
    } catch {
      setRecommendError(true);
    } finally {
      setRecommendLoading(false);
    }
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Eventos y destinos"
        subtitle="Llegá a los eventos culturales en bicicleta y encontrá una estación segura donde devolverla."
      />
      <MobilityNavigation />

      <Group justify="space-between">
        <Text c="dimmed" size="sm">Eventos publicados por Espacios Públicos.</Text>
        <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={() => void refresh()} loading={loading}>
          Actualizar
        </Button>
      </Group>

      {error && (
        <Alert color="red" icon={<CircleAlert size={18} />} title="No se pudieron consultar los destinos">
          Verificá la conexión y volvé a intentar.
        </Alert>
      )}
      {loading && <Group><Loader size="sm" /><Text>Cargando eventos…</Text></Group>}
      {!loading && !error && events.length === 0 && (
        <Alert color="blue" title="Sin próximos eventos disponibles">
          Cuando Espacios Públicos publique eventos habilitados, aparecerán acá.
        </Alert>
      )}

      {!error && <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {events.map((event) => (
          <Paper key={event.eventId} withBorder p="lg" radius="md">
            <Stack gap="sm">
              <Group justify="space-between" align="start">
                <Title order={2} size="h3">{event.title}</Title>
                <Badge color="blue" variant="light">Evento</Badge>
              </Group>
              <Group gap="xs">
                <CalendarDays size={16} />
                <Text size="sm">{formatDate(event.startsAt)}</Text>
              </Group>
              <Group gap="xs">
                <MapPin size={16} />
                <Text size="sm">{event.address ?? event.zone ?? 'Ubicación registrada'}</Text>
              </Group>
              <Text size="sm" c="dimmed">Inscriptos: {event.registrations} · Cupo: {event.maxCapacity}</Text>
              <Button
                leftSection={<Navigation size={17} />}
                onClick={() => void viewRecommendation(event.eventId)}
                disabled={selectedId === event.eventId && recommendLoading}
              >
                Ver estación recomendada
              </Button>
              {selectedId === event.eventId && (
                <Stack gap="xs">
                  {recommendLoading && <Group><Loader size="xs" /><Text size="sm">Calculando una ruta segura…</Text></Group>}
                  {recommendError && (
                    <Alert color="red" title="No se pudo obtener la recomendación">
                      Puede que el evento se haya cancelado o que el servicio no esté disponible.
                    </Alert>
                  )}
                  {recommendation && (
                    <Alert color={recommendation.status === 'RECOMMENDED' ? 'green' : 'orange'}
                      title={recommendation.status === 'RECOMMENDED' ? 'Estación sugerida' : 'Sin estación para recomendar'}>
                      <Stack gap="xs">
                        <Text size="sm">{recommendation.message}</Text>
                        {recommendation.station && (
                          <>
                            <Text fw={700}>{recommendation.station.stationName}</Text>
                            <Text size="sm">
                              {recommendation.station.distanceMeters} m del evento ·
                              {recommendation.station.availableSlots} lugares libres
                            </Text>
                            <Button
                              component="a"
                              href={`https://www.google.com/maps/dir/?api=1&destination=${recommendation.station.latitude},${recommendation.station.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              size="xs"
                              variant="light"
                            >
                              Cómo llegar a la estación
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Alert>
                  )}
                </Stack>
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>}
    </Stack>
  );
}
