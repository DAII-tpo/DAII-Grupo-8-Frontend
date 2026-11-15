import { Alert, Badge, Button, Group, Loader, NativeSelect, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { CalendarDays, CircleAlert, MapPin, Navigation, RefreshCw, Route } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { culturalDestinationService } from '../../services/destinations/culturalDestinationService';
import { eventMobilityService } from '../../services/eventMobility/eventMobilityService';
import { stationService } from '../../services/stations/stationService';
import type { CulturalDestination } from '../../types/culturalDestination';
import type { EventArrivalIntent, EventMobilityDecision } from '../../types/eventMobility';
import type { Station } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';
import type { StationRecommendation } from '../../types/stationRecommendation';
import pageClasses from '../../styles/mobilityPage.module.css';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso));
}

export function CulturalDestinationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedEventId = searchParams.get('eventId');
  const [events, setEvents] = useState<CulturalDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await culturalDestinationService.upcoming();
      setEvents(result);
      setSelectedId(requestedEventId && result.some((event) => event.eventId === requestedEventId)
        ? requestedEventId : null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [requestedEventId]);

  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

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
              {Number.isFinite(event.latitude) && Number.isFinite(event.longitude) ? (
                <Button
                  leftSection={<MapPin size={17} />}
                  variant="subtle"
                  onClick={() => navigate(`/movilidad/mapa?eventId=${encodeURIComponent(event.eventId)}`)}
                >
                  Ver ubicación en el mapa
                </Button>
              ) : (
                <Alert color="yellow" title="Ubicación no disponible">
                  Este evento no tiene coordenadas válidas para mostrarlo en el mapa.
                </Alert>
              )}
              <Text size="sm" c="dimmed">Inscriptos: {event.registrations} · Cupo: {event.maxCapacity}</Text>
              <Text size="sm">Demanda de referencia: {event.expectedDemand ?? event.registrations} asistentes</Text>
              {event.maxCapacity > 0 && (event.expectedDemand ?? event.registrations) >= event.maxCapacity && (
                <Badge color="orange" variant="light">Cupo completo</Badge>
              )}
              <Button
                leftSection={<Navigation size={17} />}
                onClick={() => setSelectedId(event.eventId)}
              >
                Planificá tu llegada
              </Button>
              {selectedId === event.eventId && (
                <EventArrivalPlanner event={event} />
              )}
            </Stack>
          </Paper>
        ))}
      </SimpleGrid>}
    </Stack>
  );
}

type OriginDetails = {
  availableBikes: number | null;
  distanceMeters: number | null;
  latitude: number;
  longitude: number;
  name: string;
  stationId: number;
};

function recommendationStations(recommendation: StationRecommendation | null) {
  return recommendation?.station ? [recommendation.station, ...recommendation.alternatives] : [];
}

function resolveOrigin(
  selectedId: number | null,
  stations: Station[],
  availability: StationAvailability[],
  recommendation: StationRecommendation | null,
): OriginDetails | null {
  if (selectedId === null) return null;
  const recommended = recommendationStations(recommendation)
    .find((station) => station.stationId === selectedId);
  const registered = stations.find((station) => station.id === selectedId);
  const current = availability.find((item) => item.stationId === selectedId);
  if (recommended) {
    return {
      availableBikes: current?.availableBikes ?? recommended.availableBikes,
      distanceMeters: recommended.distanceMeters,
      latitude: recommended.latitude,
      longitude: recommended.longitude,
      name: recommended.stationName,
      stationId: recommended.stationId,
    };
  }
  if (!registered) return null;
  return {
    availableBikes: current?.availableBikes ?? null,
    distanceMeters: null,
    latitude: registered.latitude,
    longitude: registered.longitude,
    name: registered.name,
    stationId: registered.id,
  };
}

function EventArrivalPlanner({ event }: Readonly<{ event: CulturalDestination }>) {
  const canUseGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [stations, setStations] = useState<Station[]>([]);
  const [availability, setAvailability] = useState<StationAvailability[]>([]);
  const [originRecommendation, setOriginRecommendation] = useState<StationRecommendation | null>(null);
  const [selectedOriginId, setSelectedOriginId] = useState<number | null>(null);
  const [originLoading, setOriginLoading] = useState(canUseGeolocation);
  const [geolocationUnavailable, setGeolocationUnavailable] = useState(!canUseGeolocation);
  const [originError, setOriginError] = useState(false);
  const [decision, setDecision] = useState<EventMobilityDecision | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(false);
  const [arrivalIntent, setArrivalIntent] = useState<EventArrivalIntent | null>(null);
  const [confirmedDestinationName, setConfirmedDestinationName] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);
  const request = useRef(0);

  useEffect(() => {
    const requestId = ++request.current;
    Promise.allSettled([stationService.getAll(), stationService.getAllAvailability()]).then(([catalog, snapshot]) => {
      if (requestId !== request.current) return;
      if (catalog.status === 'fulfilled') {
        setStations(catalog.value.filter((station) => station.status === 'ACTIVE'));
      } else {
        setOriginError(true);
      }
      if (snapshot.status === 'fulfilled') setAvailability(snapshot.value);
    }).catch(() => setOriginError(true));

    if (!canUseGeolocation) {
      return () => { request.current += 1; };
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        stationService.getRecommendation(position.coords.latitude, position.coords.longitude, 'PICKUP')
          .then((recommendation) => {
            if (requestId !== request.current) return;
            setOriginRecommendation(recommendation);
            if (recommendation.station) {
              setSelectedOriginId(recommendation.station.stationId);
            } else {
              setOriginError(true);
            }
          })
          .catch(() => {
            if (requestId === request.current) setOriginError(true);
          })
          .finally(() => {
            if (requestId === request.current) setOriginLoading(false);
          });
      },
      () => {
        if (requestId !== request.current) return;
        setGeolocationUnavailable(true);
        setOriginLoading(false);
      },
    );
    return () => { request.current += 1; };
  }, [canUseGeolocation, event.eventId]);

  useEffect(() => {
    (eventMobilityService.getArrivalIntent?.(event.eventId) ?? Promise.resolve(null))
      .then(setArrivalIntent)
      .catch(() => setArrivalIntent(null));
  }, [event.eventId]);

  const origin = resolveOrigin(selectedOriginId, stations, availability, originRecommendation);

  const changeOrigin = async (value: string) => {
    const stationId = value ? Number(value) : null;
    setSelectedOriginId(stationId);
    setDecision(null);
    setDecisionError(false);
    if (stationId === null || availability.some((item) => item.stationId === stationId)) return;
    try {
      const current = await stationService.getAvailability(stationId);
      setAvailability((items) => [...items.filter((item) => item.stationId !== stationId), current]);
    } catch {
      setOriginError(true);
    }
  };

  const calculatePlan = async () => {
    if (!origin || !origin.availableBikes) return;
    setDecisionLoading(true);
    setDecisionError(false);
    setDecision(null);
    try {
      setDecision(await eventMobilityService.decide(event.eventId, {
        attending: true,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
      }));
    } catch {
      setDecisionError(true);
    } finally {
      setDecisionLoading(false);
    }
  };

  const confirmDestination = async (stationId: number) => {
    setIntentLoading(true);
    try {
      const registered = await eventMobilityService.registerArrivalIntent(event.eventId, stationId, event.startsAt);
      setArrivalIntent(registered);
      setConfirmedDestinationName(recommendationStations(decision?.dropoff ?? null)
        .find((station) => station.stationId === stationId)?.stationName
        ?? stations.find((station) => station.id === stationId)?.name
        ?? null);
      setDecision(await eventMobilityService.decide(event.eventId, {
        attending: true,
        originLatitude: origin?.latitude,
        originLongitude: origin?.longitude,
      }));
    } finally {
      setIntentLoading(false);
    }
  };

  const cancelIntent = async () => {
    setIntentLoading(true);
    try {
      await eventMobilityService.cancelArrivalIntent(event.eventId);
      setArrivalIntent(null);
      setConfirmedDestinationName(null);
    } finally {
      setIntentLoading(false);
    }
  };

  return (
    <Stack gap="md">
      <Alert color="blue" title="Planificá tu llegada al evento">
        Elegí cómo querés moverte y consultá disponibilidad real antes de salir.
      </Alert>
      {originLoading && (
        <Group><Loader size="xs" /><Text size="sm">Buscando una estación de salida conveniente…</Text></Group>
      )}
      {geolocationUnavailable && (
        <Alert color="yellow" title="Elegí el origen manualmente">
          No se pudo usar tu ubicación. Podés seleccionar una estación activa de la lista.
        </Alert>
      )}
      <NativeSelect
        label="Estación de origen"
        description="Podés cambiar la estación desde donde salís."
        value={selectedOriginId?.toString() ?? ''}
        onChange={(changeEvent) => void changeOrigin(changeEvent.currentTarget.value)}
        disabled={originLoading && stations.length === 0}
      >
        <option value="">Seleccioná una estación</option>
        {stations.map((station) => {
          const current = availability.find((item) => item.stationId === station.id);
          const bikes = current ? ` · ${current.availableBikes} bicicletas` : '';
          return <option key={station.id} value={station.id}>{station.name}{bikes}</option>;
        })}
      </NativeSelect>
      {origin?.availableBikes === 0 && (
        <Alert color="orange">Esta estación no tiene bicicletas disponibles. Elegí otra para planificar el trayecto.</Alert>
      )}
      {originError && stations.length === 0 && (
        <Alert color="red">No se pudieron consultar estaciones reales en este momento.</Alert>
      )}

      <Button
        leftSection={<Route size={17} />}
        loading={decisionLoading}
        disabled={!origin || !origin.availableBikes}
        onClick={() => void calculatePlan()}
      >
        Calcular plan
      </Button>
      {decisionError && <Alert color="red">No se pudo calcular el plan con la disponibilidad actual.</Alert>}
      {arrivalIntent?.status === 'ACTIVE' && confirmedDestinationName && (
        <Alert color="teal" title="Intención de llegada registrada">
          Listo, elegiste <strong>{confirmedDestinationName}</strong> para devolver tu bicicleta. Esto mejora la proyección, pero no reserva un anclaje.
          <Button ml="sm" size="xs" variant="subtle" loading={intentLoading} onClick={() => void cancelIntent()}>Cancelar intención</Button>
        </Alert>
      )}
      {decision && origin && <PlanResult
        arrivalIntent={arrivalIntent}
        decision={decision}
        intentLoading={intentLoading}
        onConfirmDestination={confirmDestination}
        origin={origin}
      />}
    </Stack>
  );
}

function PlanResult({ arrivalIntent, decision, intentLoading, onConfirmDestination, origin }: Readonly<{
  arrivalIntent: EventArrivalIntent | null;
  decision: EventMobilityDecision;
  intentLoading: boolean;
  onConfirmDestination: (stationId: number) => Promise<void>;
  origin: OriginDetails;
}>) {
  const recommendation = decision.dropoff;
  const destinations = recommendationStations(recommendation);
  const title = 'Tu plan de llegada al evento';
  return (
    <Alert color="green" title={title}>
      <Stack gap="sm">
        <Text size="sm">Origen: <strong>{origin.name}</strong> · {origin.availableBikes} bicicletas disponibles.</Text>
        <Text size="sm">{recommendation?.message ?? decision.message}</Text>
        {destinations.length === 0 && <Text size="sm">No hay una estación de destino viable con la disponibilidad actual.</Text>}
        {destinations.map((destination, index) => (
          <Paper key={destination.stationId} p="sm" withBorder>
            <Stack gap="xs">
              <Text fw={700}>{index === 0 ? 'Destino recomendado' : `Alternativa ${index}`}: {destination.stationName}</Text>
              <Text size="sm">{destination.distanceMeters} m del evento · {destination.availableSlots} anclajes libres</Text>
              {(decision.stationProjections ?? []).find((item) => item.stationId === destination.stationId) && (() => {
                const projection = (decision.stationProjections ?? []).find((item) => item.stationId === destination.stationId)!;
                return <Text size="sm">
                  {projection.projectedArrivals} llegadas previstas · {projection.projectedAvailableSlots} anclajes proyectados
                  {projection.saturationRisk === 'LOW' ? '' : ' · Riesgo de saturación'}
                </Text>;
              })()}
              <Button
                size="xs"
                variant={arrivalIntent?.stationId === destination.stationId && arrivalIntent.status === 'ACTIVE' ? 'filled' : 'outline'}
                loading={intentLoading}
                onClick={() => void onConfirmDestination(destination.stationId)}
              >
                {arrivalIntent?.stationId === destination.stationId && arrivalIntent.status === 'ACTIVE'
                  ? 'Estación elegida' : 'Voy a utilizar esta estación'}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Alert>
  );
}
