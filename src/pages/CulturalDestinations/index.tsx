import { Alert, Badge, Button, Group, Loader, NativeSelect, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { CalendarDays, CircleAlert, MapPin, Navigation, RefreshCw, Route } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { eventMobilityService } from '../../services/eventMobility/eventMobilityService';
import { stationService } from '../../services/stations/stationService';
import type { CulturalDestination } from '../../types/culturalDestination';
import type { EventArrivalIntent, EventMobilityDecision } from '../../types/eventMobility';
import type { Station } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';
import type { StationRecommendation } from '../../types/stationRecommendation';
import pageClasses from '../../styles/mobilityPage.module.css';
import classes from './CulturalDestinations.module.css';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso));
}

export function CulturalDestinationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedEventId = searchParams.get('eventId');
  const resumePlanner = searchParams.get('resume') === '1';
  const [events, setEvents] = useState<CulturalDestination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedCardRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async (force = false) => {
    setLoading(true);
    setError(false);
    try {
      const result = await eventMobilityService.upcoming(force);
      setEvents(result);
      setSelectedId(requestedEventId && result.some((event) => event.eventId === requestedEventId)
        ? requestedEventId : null);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [requestedEventId]);

  useEffect(() => { void Promise.resolve().then(() => refresh()); }, [refresh]);

  useEffect(() => {
    if (!loading && selectedId) selectedCardRef.current?.scrollIntoView?.({ block: 'start', inline: 'nearest' });
  }, [loading, selectedId]);

  const requestedEventMissing = !loading && !error && Boolean(requestedEventId)
    && !events.some((event) => event.eventId === requestedEventId);

  const openPlanner = (eventId: string) => {
    setSelectedId(eventId);
    void navigate(`/movilidad/eventos?eventId=${encodeURIComponent(eventId)}`, { replace: true });
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Eventos y destinos"
        subtitle="Llegá a los eventos culturales en bicicleta y encontrá una estación segura donde devolverla."
      />

      <Group justify="space-between">
        <Text c="dimmed" size="sm">Eventos publicados por Espacios Públicos.</Text>
        <Button variant="light" leftSection={<RefreshCw size={16} />} onClick={() => void refresh(true)} loading={loading}>
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
      {requestedEventMissing && (
        <Alert color="orange" title="El evento seleccionado ya no está disponible">
          Puede haber finalizado o sido cancelado. Podés elegir otro evento o volver al mapa.
          <Button ml="sm" size="xs" variant="subtle" onClick={() => navigate('/movilidad/mapa')}>Volver al mapa</Button>
        </Alert>
      )}

      {!error && <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        {events.map((event) => (
          <Paper
            className={selectedId === event.eventId ? classes.selectedEvent : undefined}
            ref={selectedId === event.eventId ? selectedCardRef : undefined}
            key={event.eventId}
            withBorder
            p="lg"
            radius="md"
          >
            <Stack gap="sm">
              <Group justify="space-between" align="start">
                <Title order={2} size="h3">{event.title}</Title>
                <Badge color="blue" variant="light">Evento</Badge>
              </Group>
              <Group gap="xs">
                <CalendarDays size={16} />
                <Text size="sm">{formatDate(event.startsAt)}</Text>
              </Group>
              {Number.isFinite(event.latitude) && Number.isFinite(event.longitude) ? (
                <Group align="center" gap="xs" justify="space-between" wrap="wrap">
                  <Group gap="xs" wrap="nowrap">
                    <MapPin aria-hidden="true" size={16} />
                    <Text size="sm">{event.address ?? event.zone ?? 'Ubicación registrada'}</Text>
                  </Group>
                  <Button
                    className={classes.locationLink}
                    leftSection={<MapPin size={15} />}
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => navigate(`/movilidad/mapa?eventId=${encodeURIComponent(event.eventId)}&returnTo=${selectedId === event.eventId ? 'planner' : 'events'}`)}
                  >
                    Ver ubicación en el mapa
                  </Button>
                </Group>
              ) : (
                <>
                  <Group gap="xs"><MapPin aria-hidden="true" size={16} /><Text size="sm">{event.address ?? event.zone ?? 'Ubicación registrada'}</Text></Group>
                  <Alert color="yellow" title="Ubicación no disponible">Este evento no tiene coordenadas válidas para mostrarlo en el mapa.</Alert>
                </>
              )}
              <Text size="sm" c="dimmed">Inscriptos: {event.registrations} · Cupo: {event.maxCapacity}</Text>
              <Text size="sm">Demanda de referencia: {event.expectedDemand ?? event.registrations} asistentes</Text>
              {event.maxCapacity > 0 && (event.expectedDemand ?? event.registrations) >= event.maxCapacity && (
                <Badge color="orange" variant="light">Cupo completo</Badge>
              )}
              <Button
                leftSection={<Navigation size={17} />}
                onClick={() => openPlanner(event.eventId)}
              >
                Planificá tu llegada
              </Button>
              {selectedId === event.eventId && (
                <EventArrivalPlanner event={event} resume={resumePlanner} />
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

type PlannerDraft = {
  confirmedDestinationName: string | null;
  decision: EventMobilityDecision | null;
  originRecommendation: StationRecommendation | null;
  selectedDestinationId: number | null;
  selectedOriginId: number | null;
};

function plannerDraftKey(eventId: string) {
  return `mobility-event-planner:${eventId}`;
}

function readPlannerDraft(eventId: string): PlannerDraft | null {
  try {
    const value = sessionStorage.getItem(plannerDraftKey(eventId));
    return value ? JSON.parse(value) as PlannerDraft : null;
  } catch {
    return null;
  }
}

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

function EventArrivalPlanner({ event, resume }: Readonly<{ event: CulturalDestination; resume: boolean }>) {
  const navigate = useNavigate();
  const [restoredDraft] = useState(() => resume ? readPlannerDraft(event.eventId) : null);
  const canUseGeolocation = typeof navigator !== 'undefined' && Boolean(navigator.geolocation);
  const [stations, setStations] = useState<Station[]>([]);
  const [availability, setAvailability] = useState<StationAvailability[]>([]);
  const [originRecommendation, setOriginRecommendation] = useState<StationRecommendation | null>(restoredDraft?.originRecommendation ?? null);
  const [selectedOriginId, setSelectedOriginId] = useState<number | null>(restoredDraft?.selectedOriginId ?? null);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [geolocationLoading, setGeolocationLoading] = useState(canUseGeolocation);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [slowOriginLoading, setSlowOriginLoading] = useState(false);
  const [geolocationUnavailable, setGeolocationUnavailable] = useState(!canUseGeolocation);
  const [originError, setOriginError] = useState(false);
  const [originLoadAttempt, setOriginLoadAttempt] = useState(0);
  const [decision, setDecision] = useState<EventMobilityDecision | null>(restoredDraft?.decision ?? null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(false);
  const [arrivalIntent, setArrivalIntent] = useState<EventArrivalIntent | null>(null);
  const [confirmedDestinationName, setConfirmedDestinationName] = useState<string | null>(restoredDraft?.confirmedDestinationName ?? null);
  const [selectedDestinationId, setSelectedDestinationId] = useState<number | null>(restoredDraft?.selectedDestinationId ?? null);
  const [intentLoading, setIntentLoading] = useState(false);
  const request = useRef(0);
  const manualOriginSelection = useRef(restoredDraft?.selectedOriginId !== null && restoredDraft?.selectedOriginId !== undefined);

  useEffect(() => {
    sessionStorage.setItem(plannerDraftKey(event.eventId), JSON.stringify({
      confirmedDestinationName,
      decision,
      originRecommendation,
      selectedDestinationId,
      selectedOriginId,
    } satisfies PlannerDraft));
  }, [confirmedDestinationName, decision, event.eventId, originRecommendation, selectedDestinationId, selectedOriginId]);

  useEffect(() => {
    const requestId = ++request.current;
    const slowTimer = window.setTimeout(() => setSlowOriginLoading(true), 8_000);
    void Promise.resolve().then(() => {
      if (requestId !== request.current) return;
      setStationsLoading(true);
      setGeolocationLoading(canUseGeolocation);
      setRecommendationLoading(false);
      setSlowOriginLoading(false);
      setOriginError(false);
      setGeolocationUnavailable(!canUseGeolocation);
      Promise.allSettled([stationService.getAll(), stationService.getAllAvailability()]).then(([catalog, snapshot]) => {
        if (requestId !== request.current) return;
        if (catalog.status === 'fulfilled') {
          setStations(catalog.value.filter((station) => station.status === 'ACTIVE'));
        } else {
          setOriginError(true);
        }
        if (snapshot.status === 'fulfilled') setAvailability(snapshot.value);
        setStationsLoading(false);
      }).catch(() => {
        if (requestId !== request.current) return;
        setOriginError(true);
        setStationsLoading(false);
      });

      if (!canUseGeolocation) {
        setGeolocationLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (requestId !== request.current) return;
          setGeolocationLoading(false);
          if (manualOriginSelection.current) return;
          setRecommendationLoading(true);
          stationService.getRecommendation(position.coords.latitude, position.coords.longitude, 'PICKUP')
            .then((recommendation) => {
              if (requestId !== request.current) return;
              setOriginRecommendation(recommendation);
              if (recommendation.station && !manualOriginSelection.current) {
                setSelectedOriginId(recommendation.station.stationId);
              } else if (!recommendation.station) {
                setOriginError(true);
              }
            })
            .catch(() => {
              if (requestId === request.current) setOriginError(true);
            })
            .finally(() => {
              if (requestId === request.current) setRecommendationLoading(false);
            });
        },
        () => {
          if (requestId !== request.current) return;
          setGeolocationUnavailable(true);
          setGeolocationLoading(false);
        },
      );
    });
    return () => { window.clearTimeout(slowTimer); request.current += 1; };
  }, [canUseGeolocation, event.eventId, originLoadAttempt]);

  useEffect(() => {
    (eventMobilityService.getArrivalIntent?.(event.eventId) ?? Promise.resolve(null))
      .then(setArrivalIntent)
      .catch(() => setArrivalIntent(null));
  }, [event.eventId]);

  const origin = resolveOrigin(selectedOriginId, stations, availability, originRecommendation);
  const originDataLoading = stationsLoading || geolocationLoading || recommendationLoading;
  const originLoadingMessage = geolocationLoading
    ? 'Obteniendo tu ubicación…'
    : recommendationLoading
      ? 'Seleccionando estación de origen…'
      : 'Buscando estaciones cercanas…';

  const useManualOrigin = () => {
    manualOriginSelection.current = true;
    setGeolocationUnavailable(true);
    setGeolocationLoading(false);
    setRecommendationLoading(false);
  };

  const viewStationOnMap = (station: { latitude: number; longitude: number; stationId: number }) => {
    const params = new URLSearchParams({
      eventId: event.eventId,
      focus: 'station',
      latitude: station.latitude.toString(),
      longitude: station.longitude.toString(),
      returnTo: 'planner',
      stationId: station.stationId.toString(),
    });
    void navigate(`/movilidad/mapa?${params.toString()}`);
  };

  const changeOrigin = async (value: string) => {
    const stationId = value ? Number(value) : null;
    manualOriginSelection.current = true;
    setSelectedOriginId(stationId);
    setDecision(null);
    setSelectedDestinationId(null);
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
    setSelectedDestinationId(null);
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

  const confirmDestination = async () => {
    if (selectedDestinationId === null) return;
    setIntentLoading(true);
    try {
      const registered = await eventMobilityService.registerArrivalIntent(event.eventId, selectedDestinationId, event.startsAt);
      setArrivalIntent(registered);
      setConfirmedDestinationName(recommendationStations(decision?.dropoff ?? null)
        .find((station) => station.stationId === selectedDestinationId)?.stationName
        ?? stations.find((station) => station.id === selectedDestinationId)?.name
        ?? null);
      setSelectedDestinationId(null);
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
      setSelectedDestinationId(null);
    } finally {
      setIntentLoading(false);
    }
  };

  return (
    <Stack className={classes.planner} gap="md">
      <div className={classes.plannerHeader}><Title className={classes.plannerTitle} order={3}>Planificá tu llegada</Title></div>
      {originDataLoading && (
        <Alert color="blue" icon={<Loader size="xs" />} title={originLoadingMessage}>
          Estamos preparando las estaciones disponibles para este viaje.
          {slowOriginLoading && <>
            <Text mt="xs" size="sm">Está demorando más de lo habitual, pero la operación continúa.</Text>
            {stations.length > 0 && <Button mt="xs" size="xs" variant="subtle" onClick={useManualOrigin}>Elegir origen manualmente</Button>}
          </>}
        </Alert>
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
        disabled={originDataLoading || stations.length === 0}
      >
        <option value="">{originDataLoading ? originLoadingMessage : 'Seleccioná una estación'}</option>
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
        <Alert color="red" title="No se pudieron consultar las estaciones">
          <Text size="sm">No se pudieron consultar estaciones reales en este momento.</Text>
          <Button mt="xs" size="xs" variant="subtle" onClick={() => setOriginLoadAttempt((attempt) => attempt + 1)}>Reintentar</Button>
        </Alert>
      )}
      {origin && (
        <Button className={classes.mapAction} leftSection={<MapPin size={15} />} size="xs" variant="subtle" onClick={() => viewStationOnMap(origin)}>
          Ver estación de origen en el mapa
        </Button>
      )}
      {originError && stations.length > 0 && !originDataLoading && selectedOriginId === null && (
        <Alert color="yellow" title="No pudimos sugerir una estación">
          Podés elegir manualmente una estación activa de la lista.
          <Button ml="sm" size="xs" variant="subtle" onClick={() => setOriginLoadAttempt((attempt) => attempt + 1)}>Reintentar</Button>
        </Alert>
      )}

      <Button
        leftSection={<Route size={17} />}
        loading={decisionLoading}
        disabled={originDataLoading || !origin || !origin.availableBikes}
        onClick={() => void calculatePlan()}
      >
        Calcular plan
      </Button>
      {decisionError && <Alert color="red">No se pudo calcular el plan con la disponibilidad actual.</Alert>}
      {selectedDestinationId !== null && (
        <Alert color="blue" title="Revisá la estación elegida">
          Vas a devolver la bicicleta en <strong>{recommendationStations(decision?.dropoff ?? null)
            .find((station) => station.stationId === selectedDestinationId)?.stationName}</strong>. La intención se guardará recién cuando confirmes.
          <Group mt="sm">
            <Button size="xs" loading={intentLoading} onClick={() => void confirmDestination()}>Confirmar estación</Button>
            <Button size="xs" variant="subtle" onClick={() => setSelectedDestinationId(null)}>Cambiar elección</Button>
          </Group>
        </Alert>
      )}
      {arrivalIntent?.status === 'ACTIVE' && confirmedDestinationName && (
        <Alert color="teal" title="Intención de llegada registrada">
          Listo, vas a <strong>{event.title}</strong> y elegiste <strong>{confirmedDestinationName}</strong> para devolver tu bicicleta. Esto mejora la proyección, pero no reserva un anclaje.
          <Group mt="sm">
            <Button size="xs" onClick={() => navigate('/movilidad/mapa')}>Volver al mapa</Button>
            <Button size="xs" variant="subtle" loading={intentLoading} onClick={() => void cancelIntent()}>Cancelar intención</Button>
          </Group>
        </Alert>
      )}
      {decision && origin && <PlanResult
        arrivalIntent={arrivalIntent}
        decision={decision}
        intentLoading={intentLoading}
        onSelectDestination={setSelectedDestinationId}
        origin={origin}
        selectedDestinationId={selectedDestinationId}
        onViewDestination={viewStationOnMap}
      />}
    </Stack>
  );
}

function PlanResult({ arrivalIntent, decision, intentLoading, onSelectDestination, onViewDestination, origin, selectedDestinationId }: Readonly<{
  arrivalIntent: EventArrivalIntent | null;
  decision: EventMobilityDecision;
  intentLoading: boolean;
  onSelectDestination: (stationId: number) => void;
  onViewDestination: (station: { latitude: number; longitude: number; stationId: number }) => void;
  origin: OriginDetails;
  selectedDestinationId: number | null;
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
              <Button leftSection={<MapPin size={15} />} size="xs" variant="subtle" onClick={() => onViewDestination(destination)}>
                Ver estación de destino en el mapa
              </Button>
              <Button
                size="xs"
                variant={selectedDestinationId === destination.stationId ? 'filled' : 'outline'}
                loading={intentLoading}
                onClick={() => onSelectDestination(destination.stationId)}
              >
                {arrivalIntent?.stationId === destination.stationId && arrivalIntent.status === 'ACTIVE'
                  ? 'Cambiar a esta estación' : selectedDestinationId === destination.stationId
                    ? 'Estación seleccionada' : 'Elegir esta estación'}
              </Button>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Alert>
  );
}
