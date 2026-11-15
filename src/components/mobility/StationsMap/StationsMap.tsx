import 'leaflet/dist/leaflet.css';

import { Alert, Badge, Button, Group, Loader, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { isAxiosError } from 'axios';
import { divIcon, type Map as LeafletMap } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { AlertCircle, ArrowLeft, Bike, CalendarDays, LocateFixed, MapPin, Navigation, Sparkles, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/authContext';
import { eventMobilityService } from '../../../services/eventMobility/eventMobilityService';
import { stationService } from '../../../services/stations/stationService';
import { climateService } from '../../../services/climate/climateService';
import { tripService } from '../../../services/trips/tripService';
import { cicloviaObstructionService } from '../../../services/obstructions/cicloviaObstructionService';
import type { NearbyStation } from '../../../types/nearbyStation';
import type { CulturalDestination } from '../../../types/eventMobility';
import type { Station } from '../../../types/station';
import type { StationAvailability } from '../../../types/stationAvailability';
import type { ClimateAlert } from '../../../types/climateAlert';
import type { RecommendationPurpose, StationRecommendation } from '../../../types/stationRecommendation';
import type { CicloviaObstruction } from '../../../types/cicloviaObstruction';

import classes from './StationsMap.module.css';

type Coordinates = [number, number];
type MapBounds = { north: number; south: number; east: number; west: number };

const EVENT_WARNING_LEAD_HOURS = Number(import.meta.env.VITE_EVENT_WARNING_LEAD_HOURS ?? 24);
const EVENT_WARNING_RADIUS_METERS = Number(import.meta.env.VITE_EVENT_WARNING_RADIUS_METERS ?? 1500);

type EventTemporalStatus = 'IN_PROGRESS' | 'UPCOMING';

function distanceMeters(origin: Coordinates, event: CulturalDestination) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(event.latitude - origin[0]);
  const longitudeDelta = toRadians(event.longitude - origin[1]);
  const originLatitude = toRadians(origin[0]);
  const eventLatitude = toRadians(event.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(eventLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMeters * Math.asin(Math.sqrt(haversine));
}

function isWithinBounds(event: CulturalDestination, bounds: MapBounds | null) {
  return bounds !== null
    && event.latitude <= bounds.north && event.latitude >= bounds.south
    && event.longitude <= bounds.east && event.longitude >= bounds.west;
}

function temporalStatus(event: CulturalDestination, now: number): EventTemporalStatus | null {
  const startsAt = new Date(event.startsAt).getTime();
  const endsAt = new Date(event.endsAt).getTime();
  if (now >= startsAt && now <= endsAt) return 'IN_PROGRESS';
  if (now < startsAt && startsAt - now <= EVENT_WARNING_LEAD_HOURS * 60 * 60 * 1000) return 'UPCOMING';
  return null;
}

type MapStation = {
  address: string;
  availableBikes: number | null;
  availableSlots: number | null;
  capacity: number;
  distanceMeters: number | null;
  id: number;
  latitude: number;
  longitude: number;
  name: string;
};

function createStationIcon(isSelected: boolean, isRecommended: boolean, hasClimateAlert: boolean) {
  const markerClasses = [
    classes.stationMarker,
    isSelected ? classes.stationMarkerSelected : null,
    isRecommended ? classes.stationMarkerRecommended : null,
    hasClimateAlert ? classes.stationMarkerClimate : null,
  ].filter(Boolean).join(' ');

  return divIcon({
    className: classes.stationMarkerHost,
    html: `<span class="${markerClasses}" aria-hidden="true"><svg viewBox="0 0 24 24" role="img"><circle cx="6" cy="17" r="3.25"/><circle cx="18" cy="17" r="3.25"/><path d="m6 17 4-7 3 7m-7 0h7l4-7m-8 0h4m-5-3h3"/></svg></span>`,
    iconAnchor: [22, 22],
    iconSize: [44, 44],
  });
}

function createEventIcon(isSelected: boolean) {
  return divIcon({
    className: classes.eventMarkerHost,
    html: `<span class="${classes.eventMarker} ${isSelected ? classes.eventMarkerSelected : ''}" aria-hidden="true">★</span>`,
    iconAnchor: [22, 22],
    iconSize: [44, 44],
  });
}

function createObstructionIcon() {
  return divIcon({
    className: classes.obstructionMarkerHost,
    html: `<span class="${classes.obstructionMarker}" aria-hidden="true">!</span>`,
    iconAnchor: [18, 36],
    iconSize: [36, 42],
  });
}

function toNearbyMapStation(station: NearbyStation): MapStation {
  return {
    address: station.address,
    availableBikes: station.availableBikes,
    availableSlots: station.availableSlots,
    capacity: station.capacity,
    distanceMeters: station.distanceMeters,
    id: station.stationId,
    latitude: station.latitude,
    longitude: station.longitude,
    name: station.stationName,
  };
}

function toRegisteredMapStation(station: Station): MapStation {
  return {
    address: station.address,
    availableBikes: null,
    availableSlots: null,
    capacity: station.capacity,
    distanceMeters: null,
    id: station.id,
    latitude: station.latitude,
    longitude: station.longitude,
    name: station.name,
  };
}

type BackendError = 'unauthorized' | 'connection' | null;

function backendErrorOf(error: unknown): BackendError {
  return isAxiosError(error) && error.response?.status === 401 ? 'unauthorized' : 'connection';
}

type StationsMapProps = Readonly<{
  showHeading?: boolean;
}>;

type MapDataSetters = Readonly<{
  setBackendError: Dispatch<SetStateAction<BackendError>>;
  setIsBackendLoading: Dispatch<SetStateAction<boolean>>;
  setIsRecommendationLoading: Dispatch<SetStateAction<boolean>>;
  setRecommendationPurpose: Dispatch<SetStateAction<RecommendationPurpose>>;
  setRecommendation: Dispatch<SetStateAction<StationRecommendation | null>>;
  setHasRecommendationError: Dispatch<SetStateAction<boolean>>;
  setStations: Dispatch<SetStateAction<MapStation[]>>;
}>;

async function loadFallbackStations({ setBackendError, setIsBackendLoading, setStations }: MapDataSetters) {
  setIsBackendLoading(true);
  setBackendError(null);

  try {
    const fallbackStations = await stationService.getAll();
    setStations(fallbackStations.map(toRegisteredMapStation));
  } catch (error) {
    setBackendError(backendErrorOf(error));
  } finally {
    setIsBackendLoading(false);
  }
}

async function loadNearbyStations(location: Coordinates, { setBackendError, setIsBackendLoading, setStations }: MapDataSetters) {
  setIsBackendLoading(true);
  setBackendError(null);

  try {
    const [registeredResult, nearbyStations] = await Promise.all([
      stationService.getAll().then((stations) => ({ stations })).catch(() => null),
      stationService.getNearby({ lat: location[0], lng: location[1] }),
    ]);
    if (!registeredResult) {
      setStations(nearbyStations.map(toNearbyMapStation));
      return;
    }
    const nearbyById = new Map(
      nearbyStations.map((station) => [station.stationId, toNearbyMapStation(station)]),
    );

    setStations(registeredResult.stations.map(
      (station) => nearbyById.get(station.id) ?? toRegisteredMapStation(station),
    ));
  } catch (error) {
    setBackendError(backendErrorOf(error));
  } finally {
    setIsBackendLoading(false);
  }
}

async function recommendationPurposeForUser(isAuthenticated: boolean): Promise<RecommendationPurpose> {
  if (!isAuthenticated) return 'PICKUP';

  try {
    const activeTrip = await tripService.getActive();
    return activeTrip ? 'DROPOFF' : 'PICKUP';
  } catch {
    return 'PICKUP';
  }
}

async function loadRecommendation(
  location: Coordinates,
  isAuthenticated: boolean,
  { setHasRecommendationError, setIsRecommendationLoading, setRecommendation, setRecommendationPurpose }: MapDataSetters,
) {
  setIsRecommendationLoading(true);
  setHasRecommendationError(false);

  try {
    const purpose = await recommendationPurposeForUser(isAuthenticated);
    setRecommendationPurpose(purpose);
    setRecommendation(await stationService.getRecommendation(location[0], location[1], purpose));
  } catch {
    setHasRecommendationError(true);
  } finally {
    setIsRecommendationLoading(false);
  }
}

function runInBackground(task: Promise<void>) {
  task.catch(() => undefined);
}

export function StationsMap({ showHeading = true }: StationsMapProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedEventId = searchParams.get('eventId');
  const requestedStationId = Number(searchParams.get('stationId'));
  const requestedLatitude = Number(searchParams.get('latitude'));
  const requestedLongitude = Number(searchParams.get('longitude'));
  const isStationFocusRequested = searchParams.get('focus') === 'station'
    && Number.isFinite(requestedStationId) && Number.isFinite(requestedLatitude) && Number.isFinite(requestedLongitude);
  const returnTo = searchParams.get('returnTo');
  const { isAuthenticated } = useAuth();
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [stations, setStations] = useState<MapStation[]>([]);
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(true);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState<BackendError>(null);
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<StationAvailability | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [hasAvailabilityError, setHasAvailabilityError] = useState(false);
  const [recommendation, setRecommendation] = useState<StationRecommendation | null>(null);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [hasRecommendationError, setHasRecommendationError] = useState(false);
  const [recommendationPurpose, setRecommendationPurpose] = useState<RecommendationPurpose>('PICKUP');
  const [events, setEvents] = useState<CulturalDestination[]>([]);
  const [obstructions, setObstructions] = useState<CicloviaObstruction[]>([]);
  const [selectedObstruction, setSelectedObstruction] = useState<CicloviaObstruction | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CulturalDestination | null>(null);
  const [climateByStation, setClimateByStation] = useState<Record<number, ClimateAlert>>({});
  const [mapBounds, setMapBounds] = useState<MapBounds | null>(null);
  const [dismissedEvents, setDismissedEvents] = useState<Set<string>>(() => new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStatuses = () => {
      climateService.getStationStatuses()
        .then((statuses) => {
          if (!mounted) return;
          const active: Record<number, ClimateAlert> = {};
          for (const status of statuses) {
            if (status.alerta?.activa) active[status.stationId] = status.alerta;
          }
          setClimateByStation(active);
        })
        .catch(() => { /* El estado climático no bloquea el mapa. */ });
    };
    loadStatuses();
    const timer = window.setInterval(loadStatuses, 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const setters: MapDataSetters = {
      setBackendError,
      setHasRecommendationError,
      setIsBackendLoading,
      setIsRecommendationLoading,
      setRecommendation,
      setRecommendationPurpose,
      setStations,
    };

    const showFallback = (message: string) => {
      setGeolocationError(message);
      setIsGeolocationLoading(false);
      runInBackground(loadFallbackStations(setters));
    };

    if (!navigator.geolocation) {
      showFallback('Tu navegador no permite obtener la ubicación actual.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: Coordinates = [position.coords.latitude, position.coords.longitude];
        setUserLocation(location);
        setIsGeolocationLoading(false);
        runInBackground(loadNearbyStations(location, setters));
        runInBackground(loadRecommendation(location, isAuthenticated, setters));
      },
      () => {
        showFallback('No se pudo obtener tu ubicación. Se muestran todas las estaciones registradas.');
      },
    );
  }, [isAuthenticated]);

  const loadEvents = useCallback(() => {
    eventMobilityService.upcoming().then((nextEvents) => {
      const validEvents = nextEvents.filter((event) => Number.isFinite(event.latitude)
        && Number.isFinite(event.longitude));
      setEvents(validEvents);
      setSelectedEvent((selected) => {
        const requested = requestedEventId
          ? validEvents.find((event) => event.eventId === requestedEventId)
          : null;
        if (requested) return requested;
        if (selected && validEvents.some((event) => event.eventId === selected.eventId)) return selected;
        return null;
      });
    }).catch(() => setEvents([]));
  }, [requestedEventId]);

  useEffect(() => {
    loadEvents();
    const refreshId = window.setInterval(loadEvents, 10_000);
    return () => window.clearInterval(refreshId);
  }, [loadEvents]);

  useEffect(() => {
    let mounted = true;
    const refresh = () => cicloviaObstructionService.getActive()
      .then((items) => {
        if (!mounted) return;
        const valid = items.filter((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
        setObstructions(valid);
        setSelectedObstruction((selected) => selected ? valid.find((item) => item.id === selected.id) ?? null : null);
      })
      .catch(() => { /* Las obstrucciones no bloquean el mapa ni sus funciones existentes. */ });
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 15_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  const selectStation = async (station: MapStation) => {
    setSelectedStation(station);
    setSelectedAvailability(null);
    setHasAvailabilityError(false);

    if (station.availableBikes !== null && station.availableSlots !== null) {
      setIsAvailabilityLoading(false);
      return;
    }

    setIsAvailabilityLoading(true);
    try {
      setSelectedAvailability(await stationService.getAvailability(station.id));
    } catch {
      setHasAvailabilityError(true);
    } finally {
      setIsAvailabilityLoading(false);
    }
  };

  const handleStationSelection = (station: MapStation) => {
    setSelectedEvent(null);
    setSelectedObstruction(null);
    selectStation(station).catch(() => undefined);
  };

  const handleEventSelection = (event: CulturalDestination) => {
    setSelectedStation(null);
    setSelectedObstruction(null);
    setSelectedEvent(event);
  };

  const handleObstructionSelection = (obstruction: CicloviaObstruction) => {
    setSelectedStation(null);
    setSelectedEvent(null);
    setSelectedObstruction(obstruction);
  };

  const firstStationCenter: Coordinates | null = stations[0]
    ? [stations[0].latitude, stations[0].longitude]
    : null;
  const mapCenter = userLocation ?? firstStationCenter;
  const explicitlyRequestedStationCenter: Coordinates | null = isStationFocusRequested
    ? [requestedLatitude, requestedLongitude]
    : null;
  const explicitlyRequestedEventCenter: Coordinates | null = !explicitlyRequestedStationCenter && requestedEventId && selectedEvent?.eventId === requestedEventId
    ? [selectedEvent.latitude, selectedEvent.longitude]
    : null;
  const viewportCenter = explicitlyRequestedStationCenter ?? explicitlyRequestedEventCenter ?? mapCenter;
  const nearbyStations = stations.filter((station) => station.distanceMeters !== null);
  const recommendedStationId = recommendation?.status === 'RECOMMENDED' ? recommendation.station?.stationId : null;
  const contextualEvent = useMemo(() => {
    return events
      .filter((event) => !dismissedEvents.has(event.eventId)
        && sessionStorage.getItem(`mobility-event-warning:${event.eventId}`) !== 'dismissed')
      .filter((event) => isWithinBounds(event, mapBounds)
        || (userLocation !== null && distanceMeters(userLocation, event) <= EVENT_WARNING_RADIUS_METERS))
      .map((event) => ({ event, status: temporalStatus(event, now) }))
      .filter((candidate): candidate is { event: CulturalDestination; status: EventTemporalStatus } => candidate.status !== null)
      .sort((left, right) => {
        if (left.status !== right.status) return left.status === 'IN_PROGRESS' ? -1 : 1;
        return new Date(left.event.startsAt).getTime() - new Date(right.event.startsAt).getTime();
      })[0] ?? null;
  }, [dismissedEvents, events, mapBounds, now, userLocation]);

  const dismissContextualEvent = (eventId: string) => {
    sessionStorage.setItem(`mobility-event-warning:${eventId}`, 'dismissed');
    setDismissedEvents((current) => new Set(current).add(eventId));
  };

  return (
    <Stack gap="lg">
      {showHeading ? <div>
        <Title className={classes.title} order={2}>
          Mapa de estaciones
        </Title>
        <Text className={classes.subtitle}>
          Consultá estaciones y disponibilidad de bicicletas en tiempo real.
        </Text>
      </div> : null}

      <MapStatusAlerts
        backendError={backendError}
        geolocationError={geolocationError}
        isBackendLoading={isBackendLoading}
        isGeolocationLoading={isGeolocationLoading}
      />

      {returnTo === 'planner' && requestedEventId ? (
        <Button
          leftSection={<ArrowLeft size={16} />}
          style={{ alignSelf: 'flex-start' }}
          variant="subtle"
          onClick={() => navigate(`/movilidad/eventos?eventId=${encodeURIComponent(requestedEventId)}&resume=1`)}
        >
          Volver al planificador
        </Button>
      ) : null}
      {returnTo === 'events' ? (
        <Button leftSection={<ArrowLeft size={16} />} style={{ alignSelf: 'flex-start' }} variant="subtle" onClick={() => navigate('/movilidad/eventos')}>
          Volver a eventos
        </Button>
      ) : null}

      {contextualEvent ? (
        <Alert
          color="orange"
          icon={<CalendarDays size={18} />}
          title={contextualEvent.status === 'IN_PROGRESS' ? 'Hay un evento en curso cerca' : 'Hay un evento próximo cerca'}
        >
          <Stack gap="xs">
            <Text size="sm">{contextualEvent.event.title} · {new Date(contextualEvent.event.startsAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</Text>
            <Text c="dimmed" size="sm">Consultá la ubicación y planificá tu llegada si vas a asistir.</Text>
            <Group>
              <Button size="xs" onClick={() => handleEventSelection(contextualEvent.event)}>
                Ver evento
              </Button>
              <Button size="xs" variant="subtle" onClick={() => dismissContextualEvent(contextualEvent.event.eventId)}>
                Cerrar
              </Button>
            </Group>
          </Stack>
        </Alert>
      ) : null}

      {!isGeolocationLoading && !isBackendLoading && !backendError ? (
        <div className={classes.mapLayout}>
          <Paper className={classes.mapPanel} radius="md" p={0}>
            {viewportCenter ? (
              <StationsMapCanvas
                center={viewportCenter}
                climateByStation={climateByStation}
                events={events}
                obstructions={obstructions}
                focusLocation={explicitlyRequestedStationCenter !== null || explicitlyRequestedEventCenter !== null}
                focusedStationId={isStationFocusRequested ? requestedStationId : null}
                onBoundsChange={setMapBounds}
                onPlanEvent={(event) => navigate(`/movilidad/eventos?eventId=${encodeURIComponent(event.eventId)}`)}
                onSelectEvent={handleEventSelection}
                onSelectObstruction={handleObstructionSelection}
                onSelectStation={handleStationSelection}
                recommendedStationId={recommendedStationId ?? null}
                selectedEventId={selectedEvent?.eventId ?? null}
                selectedStationId={selectedStation?.id ?? null}
                stations={stations}
                userLocation={userLocation}
              />
            ) : (
              <EmptyMapState />
            )}
          </Paper>

          <Stack gap="md">
          {selectedEvent ? (
            <EventDetails
              event={selectedEvent}
              now={now}
              onPlan={() => navigate(`/movilidad/eventos?eventId=${encodeURIComponent(selectedEvent.eventId)}`)}
            />
          ) : null}
          {selectedObstruction ? <ObstructionDetails obstruction={selectedObstruction} /> : null}
          {!selectedObstruction && !selectedEvent && obstructions.length > 0 ? <ObstructionSummary obstructions={obstructions} onSelect={handleObstructionSelection} /> : null}
          <RecommendationPanel error={hasRecommendationError} loading={isRecommendationLoading} purpose={recommendationPurpose} recommendation={recommendation} />
          <StationDetails
            availability={selectedAvailability}
            climateAlert={selectedStation ? climateByStation[selectedStation.id] ?? null : null}
            hasAvailabilityError={hasAvailabilityError}
            isAvailabilityLoading={isAvailabilityLoading}
            station={selectedStation}
          />
           {userLocation ? <NearbyStations stations={nearbyStations} onSelectStation={handleStationSelection} /> : null}
          </Stack>
        </div>
      ) : null}

    </Stack>
  );
}

type MapStatusAlertsProps = Readonly<{
  backendError: BackendError;
  geolocationError: string | null;
  isBackendLoading: boolean;
  isGeolocationLoading: boolean;
}>;

function MapStatusAlerts({ backendError, geolocationError, isBackendLoading, isGeolocationLoading }: MapStatusAlertsProps) {
  return <>
    {isGeolocationLoading ? <LoadingState message="Obteniendo tu ubicación..." /> : null}
    {geolocationError ? <Alert color="orange" icon={<AlertCircle size={18} />} title="Ubicación no disponible">{geolocationError}</Alert> : null}
    {isBackendLoading ? <LoadingState message="Cargando estaciones..." /> : null}
    {backendError === 'unauthorized' ? <Alert color="red" icon={<AlertCircle size={18} />} title="Sesión no válida">El servidor no aceptó tu sesión. Volvé a iniciar sesión para ver las estaciones.</Alert> : null}
    {backendError === 'connection' ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar las estaciones">Verificá la conexión con el backend e intentá nuevamente.</Alert> : null}
  </>;
}

type StationsMapCanvasProps = Readonly<{
  center: Coordinates;
  climateByStation: Record<number, ClimateAlert>;
  events: CulturalDestination[];
  obstructions: CicloviaObstruction[];
  focusLocation: boolean;
  focusedStationId: number | null;
  onBoundsChange: (bounds: MapBounds) => void;
  onPlanEvent: (event: CulturalDestination) => void;
  onSelectEvent: (event: CulturalDestination) => void;
  onSelectObstruction: (obstruction: CicloviaObstruction) => void;
  onSelectStation: (station: MapStation) => void;
  recommendedStationId: number | null;
  selectedEventId: string | null;
  selectedStationId: number | null;
  stations: MapStation[];
  userLocation: Coordinates | null;
}>;

function StationsMapCanvas({ center, climateByStation, events, obstructions, focusLocation, focusedStationId, onBoundsChange, onPlanEvent, onSelectEvent, onSelectObstruction, onSelectStation, recommendedStationId, selectedEventId, selectedStationId, stations, userLocation }: StationsMapCanvasProps) {
  return (
    <MapContainer center={center} className={classes.map} zoom={14}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapViewport center={center} zoom={focusLocation ? 16 : undefined} />
      <MapBoundsObserver onChange={onBoundsChange} />
      {userLocation ? <RecenterToUserControl location={userLocation} /> : null}
      {userLocation ? (
        <CircleMarker center={userLocation} className={classes.userMarker} pathOptions={{ color: '#2F5CA6', fillColor: '#2F5CA6', fillOpacity: 1 }} radius={8}>
          <Tooltip direction="top">Tu ubicación</Tooltip>
        </CircleMarker>
      ) : null}
      {stations.map((station) => (
        <Marker
          eventHandlers={{ click: () => onSelectStation(station) }}
          icon={createStationIcon(selectedStationId === station.id || focusedStationId === station.id, recommendedStationId === station.id,
            Boolean(climateByStation[station.id]))}
          key={station.id}
          position={[station.latitude, station.longitude]}
        >
          <Tooltip direction="top">{station.name}{climateByStation[station.id]
            ? ` · Alerta ${climateByStation[station.id].nivelCriticidad}` : ''}</Tooltip>
        </Marker>
      ))}
      {events.map((event) => (
        <Marker
          eventHandlers={{ click: () => onSelectEvent(event) }}
          icon={createEventIcon(selectedEventId === event.eventId)}
          zIndexOffset={1000}
          key={`event-${event.eventId}`}
          position={[event.latitude, event.longitude]}
        >
          <Tooltip direction="top">Evento: {event.title}</Tooltip>
          <Popup>
            <strong>{event.title}</strong><br />
            {new Date(event.startsAt).toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })} · {new Date(event.startsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}–{new Date(event.endsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}<br />
            <Button size="xs" mt="xs" onClick={() => onPlanEvent(event)}>Planificar llegada</Button>
          </Popup>
        </Marker>
      ))}
      {obstructions.map((obstruction) => (
        <Marker
          eventHandlers={{ click: () => onSelectObstruction(obstruction) }}
          icon={createObstructionIcon()}
          key={`obstruction-${obstruction.id}`}
          position={[obstruction.latitude, obstruction.longitude]}
          zIndexOffset={1200}
        >
          <Tooltip direction="top">Obstrucción de ciclovía · {obstruction.impactLevel}</Tooltip>
          <Popup>
            <strong>Obstrucción de ciclovía</strong><br />
            {obstruction.direccion ?? obstruction.barrio ?? 'Ubicación del reclamo'}<br />
            Impacto {obstruction.impactLevel.toLowerCase()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

function ObstructionSummary({ obstructions, onSelect }: Readonly<{ obstructions: CicloviaObstruction[]; onSelect: (item: CicloviaObstruction) => void }>) {
  return <Paper className={classes.obstructionDetails} p="md" withBorder>
    <Group gap="xs"><TriangleAlert aria-hidden="true" size={18} /><Title order={3}>Obstrucciones activas</Title><Badge color="red">{obstructions.length}</Badge></Group>
    <Stack gap="xs" mt="sm">
      {obstructions.map((item) => <UnstyledButton className={classes.obstructionRow} key={item.id} onClick={() => onSelect(item)}>
        <Group justify="space-between" wrap="nowrap"><div><Text fw={700} size="sm">{item.direccion || item.barrio || `Reclamo ${item.reclamoId}`}</Text><Text c="dimmed" size="xs">Impacto {item.impactLevel.toLowerCase()} · {item.affectedStationIds.length} estaciones</Text></div><Badge color={item.emergencyDispatched ? 'red' : 'orange'}>{item.emergencyDispatched ? 'Emergencias notificadas' : 'Activa'}</Badge></Group>
      </UnstyledButton>)}
    </Stack>
  </Paper>;
}

function ObstructionDetails({ obstruction }: Readonly<{ obstruction: CicloviaObstruction }>) {
  return <Paper className={classes.obstructionDetails} p="lg" withBorder>
    <Stack gap="sm">
      <Group justify="space-between"><Title order={3}>Obstrucción de ciclovía</Title><Badge color={obstruction.emergencyDispatched ? 'red' : 'orange'}>{obstruction.emergencyDispatched ? 'Emergencias notificadas' : 'Activa'}</Badge></Group>
      <Text>{obstruction.titulo || `Reclamo ${obstruction.reclamoId}`}</Text>
      <Text c="dimmed" size="sm">{obstruction.direccion || obstruction.barrio || 'Sin dirección informada'}{obstruction.direccion && obstruction.barrio ? ` · ${obstruction.barrio}` : ''}</Text>
      {obstruction.descripcion ? <Text size="sm">{obstruction.descripcion}</Text> : null}
      <div className={classes.metrics}><Metric label="Impacto" value={obstruction.impactLevel} /><Metric label="Estaciones afectadas" value={obstruction.affectedStationIds.length} /></div>
      {obstruction.affectedStationIds.length ? <Text size="sm">IDs de estaciones: {obstruction.affectedStationIds.join(', ')}</Text> : null}
      {obstruction.detourDescription ? <Alert color="blue" title="Desvío sugerido">{obstruction.detourDescription}</Alert> : null}
      <Text c="dimmed" size="xs">Reclamo {obstruction.reclamoId}</Text>
    </Stack>
  </Paper>;
}

function MapBoundsObserver({ onChange }: Readonly<{ onChange: (bounds: MapBounds) => void }>) {
  const publishBounds = useCallback((map: LeafletMap) => {
    if (typeof map.getBounds !== 'function') return;
    const bounds = map.getBounds();
    onChange({ north: bounds.getNorth(), south: bounds.getSouth(), east: bounds.getEast(), west: bounds.getWest() });
  }, [onChange]);
  const map = useMap();
  useEffect(() => {
    publishBounds(map);
    if (typeof map.on !== 'function') return undefined;
    const handler = () => publishBounds(map);
    map.on('moveend', handler);
    map.on('zoomend', handler);
    return () => {
      map.off?.('moveend', handler);
      map.off?.('zoomend', handler);
    };
  }, [map, publishBounds]);
  return null;
}

function RecommendationPanel({ error, loading, purpose, recommendation }: Readonly<{ error: boolean; loading: boolean; purpose: RecommendationPurpose; recommendation: StationRecommendation | null }>) {
  const isReturn = purpose === 'DROPOFF';
  const recommendedTitle = isReturn
    ? 'Estación recomendada para devolver la bicicleta'
    : 'Estación recomendada para retirar una bicicleta';
  const fallbackTitle = isReturn
    ? 'Alternativa sugerida para devolver la bicicleta'
    : 'Alternativa sugerida para retirar una bicicleta';

  if (loading) return <Paper className={classes.recommendationPanel} radius="md" p="md"><Group gap="sm"><Loader size="sm" /><Text size="sm">Buscando la mejor estación para {isReturn ? 'devolver la bicicleta' : 'retirar una bicicleta'}...</Text></Group></Paper>;
  if (error) return <Alert color="gray" title="Recomendación no disponible">Podés continuar usando el mapa y elegir cualquier estación.</Alert>;
  if (!recommendation) return null;
  if (recommendation.status === 'NO_RECOMMENDATION') return <Alert color="blue" title="Sin recomendación disponible">{recommendation.message}</Alert>;
  if (!recommendation.station) return null;

  const isModel = recommendation.source === 'MODEL';
  const title = isModel ? recommendedTitle : fallbackTitle;
  return <Paper className={classes.recommendationPanel} radius="md" p="md"><Stack gap="xs">
    <Group gap="xs">{isModel ? <Sparkles size={18} /> : <MapPin size={18} />}<Text fw={700}>{title}</Text></Group>
    <Text fw={700}>{recommendation.station.stationName}</Text>
    {recommendation.station.address ? <Text c="dimmed" size="sm">{recommendation.station.address}</Text> : null}
    <Group gap="md"><Text size="sm">{recommendation.station.distanceMeters} m</Text><Text size="sm">{recommendation.station.availableBikes} bicicletas</Text><Text size="sm">{recommendation.station.availableSlots} espacios</Text></Group>
    <Text size="sm">{recommendation.message}</Text>
  </Stack></Paper>;
}

function MapViewport({ center, zoom }: Readonly<{ center: Coordinates; zoom?: number }>) {
  const map = useMap();
  const [latitude, longitude] = center;

  useEffect(() => {
    if (zoom === undefined) map.setView([latitude, longitude]);
    else map.setView([latitude, longitude], zoom);
  }, [latitude, longitude, map, zoom]);

  return null;
}

function EventDetails({ event, now, onPlan }: Readonly<{
  event: CulturalDestination;
  now: number;
  onPlan: () => void;
}>) {
  const status = temporalStatus(event, now);
  return (
    <Paper className={classes.eventDetails} p="lg" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap"><CalendarDays aria-hidden="true" size={20} /><Title order={3}>{event.title}</Title></Group>
          <Badge color="orange" variant="light">{status === 'IN_PROGRESS' ? 'En curso' : 'Próximo'}</Badge>
        </Group>
        <Text c="dimmed">{event.address ?? event.zone ?? 'Evento recibido desde Espacios Públicos'}</Text>
        <Text size="sm">{new Date(event.startsAt).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}–{new Date(event.endsAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}</Text>
        <Button onClick={onPlan}>
          Planificar llegada
        </Button>
      </Stack>
    </Paper>
  );
}

function RecenterToUserControl({ location }: Readonly<{ location: Coordinates }>) {
  const map = useMap();

  return (
    <button
      aria-label="Ir a mi ubicación"
      className={classes.recenterControl}
      onClick={() => map.setView(location, 17)}
      title="Ir a mi ubicación"
      type="button"
    >
      <LocateFixed aria-hidden="true" size={20} />
    </button>
  );
}

function LoadingState({ message }: Readonly<{ message: string }>) {
  return (
    <Paper className={classes.statePanel} radius="md" p="xl">
      <Stack align="center" gap="sm">
        <Loader color="citypassUrbanBlue" />
        <Text c="dimmed">{message}</Text>
      </Stack>
    </Paper>
  );
}

function EmptyMapState() {
  return (
    <div className={classes.emptyMap}>
      <MapPin size={30} />
      <Text c="dimmed">No hay coordenadas disponibles para mostrar el mapa.</Text>
    </div>
  );
}

type StationDetailsProps = Readonly<{
  availability: StationAvailability | null;
  climateAlert: ClimateAlert | null;
  hasAvailabilityError: boolean;
  isAvailabilityLoading: boolean;
  station: MapStation | null;
}>;

function StationDetails({ availability, climateAlert, hasAvailabilityError, isAvailabilityLoading, station }: StationDetailsProps) {
  if (!station) {
    return (
      <Paper className={classes.detailsPanel} radius="md" p="lg">
        <Stack align="center" gap="sm">
          <Navigation className={classes.emptyIcon} size={28} />
          <Text c="dimmed" ta="center">Seleccioná una estación en el mapa para ver sus datos.</Text>
        </Stack>
      </Paper>
    );
  }

  const availableBikes = station.availableBikes ?? availability?.availableBikes;
  const availableSlots = station.availableSlots ?? availability?.availableSlots;

  return (
    <Paper className={classes.detailsPanel} radius="md" p="lg">
      <Stack gap="md">
          <div>
          <Title className={classes.detailsTitle} order={2}>{station.name}</Title>
          <Text c="dimmed" size="sm">{station.address || 'Sin dirección informada'}</Text>
          </div>
          {climateAlert ? <Alert color={climateAlert.nivelCriticidad === 'CRITICA' || climateAlert.nivelCriticidad === 'ALTA' ? 'red' : 'orange'}
            title={`Alerta climática ${climateAlert.nivelCriticidad.toLowerCase()}`}>
            {climateAlert.fenomeno.replaceAll('_', ' ').toLowerCase()}
            {climateAlert.nivelCriticidad === 'ALTA' || climateAlert.nivelCriticidad === 'CRITICA'
              ? ' · No se pueden iniciar viajes desde esta estación.' : null}
          </Alert> : null}

        <div className={classes.metrics}>
          <Metric label="Capacidad" value={station.capacity} />
          {station.distanceMeters !== null ? <Metric label="Distancia" value={`${station.distanceMeters} m`} /> : null}
          {availableBikes !== undefined && availableBikes !== null ? <Metric label="Bicicletas disponibles" value={availableBikes} /> : null}
          {availableSlots !== undefined && availableSlots !== null ? <Metric label="Espacios disponibles" value={availableSlots} /> : null}
        </div>

        {isAvailabilityLoading ? <Group gap="sm"><Loader color="citypassUrbanBlue" size="sm" /><Text c="dimmed" size="sm">Consultando disponibilidad...</Text></Group> : null}
        {hasAvailabilityError ? <Alert color="red" title="No se pudo consultar la disponibilidad">La estación seleccionada no está disponible o ocurrió un error al consultar el backend.</Alert> : null}
        {availableBikes === 0 ? (
          <output className={classes.unavailableNotice}>
            <Bike size={20} />
            <div>
              <Text fw={750} size="sm">No hay bicicletas disponibles</Text>
              <Text size="xs">Esta estación no cuenta con bicicletas disponibles en este momento.</Text>
            </div>
          </output>
        ) : null}
      </Stack>
    </Paper>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: number | string }>) {
  return (
    <div className={classes.metric}>
      <Text className={classes.metricValue}>{value}</Text>
      <Text c="dimmed" size="sm">{label}</Text>
    </div>
  );
}

type NearbyStationsProps = Readonly<{
  onSelectStation: (station: MapStation) => void;
  stations: MapStation[];
}>;

function NearbyStations({ onSelectStation, stations }: NearbyStationsProps) {
  return (
    <Paper className={classes.nearbyPanel} radius="md" p="md">
      <Title className={classes.nearbyTitle} order={2}>Estaciones cercanas</Title>
      {stations.length === 0 ? (
        <Text c="dimmed" mt="xs" size="sm">No se encontraron estaciones activas dentro del radio de búsqueda.</Text>
      ) : (
        <Stack gap="xs" mt="sm">
          {stations.map((station) => (
            <UnstyledButton aria-label={`Seleccionar ${station.name}`} className={classes.nearbyStation} key={station.id} onClick={() => onSelectStation(station)}>
              <Group justify="space-between" wrap="nowrap">
                <div>
                  <Text className={classes.nearbyName}>{station.name}</Text>
                  <Text c="dimmed" size="xs">{station.availableBikes} bicicletas disponibles</Text>
                </div>
                <Text className={classes.nearbyDistance}>{station.distanceMeters} m</Text>
              </Group>
            </UnstyledButton>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
