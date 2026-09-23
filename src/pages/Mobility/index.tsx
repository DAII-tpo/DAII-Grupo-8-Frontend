import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  ArrowRight,
  Bike,
  CircleAlert,
  Clock3,
  History,
  MapPin,
  Navigation,
  ParkingCircle,
  Route,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { useAuth } from '../../app/providers/authContext';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import pageClasses from '../../styles/mobilityPage.module.css';
import type { NearbyStation } from '../../types/nearbyStation';
import type { PagedResponse } from '../../types/pagination';
import type { TripResponse } from '../../types/trip';

import classes from './Mobility.module.css';

type LocationState = 'loading' | 'available' | 'unavailable';
type Tone = 'blue' | 'green' | 'amber' | 'sky';

type QuickAction = {
  description: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  path: string;
  tone: Tone;
};

const quickActions: QuickAction[] = [
  { description: 'Explorá todas las estaciones', icon: MapPin, label: 'Ver mapa', path: '/movilidad/mapa', tone: 'blue' },
  { description: 'Encontrá bicicletas disponibles', icon: ParkingCircle, label: 'Buscar estación', path: '/movilidad/estaciones', tone: 'green' },
  { description: 'Retirá o devolvé una bicicleta', icon: Bike, label: 'Gestionar viaje', path: '/movilidad/bicicletas', tone: 'sky' },
  { description: 'Consultá tus recorridos anteriores', icon: History, label: 'Ver historial', path: '/movilidad/historial', tone: 'amber' },
];

export function MobilityPage() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  const [activeTrip, setActiveTrip] = useState<TripResponse | null>(null);
  const [history, setHistory] = useState<PagedResponse<TripResponse> | null>(null);
  const [stationCount, setStationCount] = useState<number | null>(null);
  const [nearbyStation, setNearbyStation] = useState<NearbyStation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSummaryError, setHasSummaryError] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>('loading');

  const loadDashboard = useCallback(async () => {
    if (userId === null) {
      setHasSummaryError(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasSummaryError(false);
    const [activeResult, historyResult, stationsResult] = await Promise.allSettled([
      tripService.getActive(userId),
      tripService.getHistory(userId, 0, 1),
      stationService.getAll(),
    ]);

    if (activeResult.status === 'fulfilled') setActiveTrip(activeResult.value);
    if (historyResult.status === 'fulfilled') setHistory(historyResult.value);
    if (stationsResult.status === 'fulfilled') setStationCount(stationsResult.value.length);
    setHasSummaryError(
      activeResult.status === 'rejected'
      || historyResult.status === 'rejected'
      || stationsResult.status === 'rejected',
    );
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    if (!navigator.geolocation) {
      void Promise.resolve().then(() => setLocationState('unavailable'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void stationService.getNearby({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          limit: 1,
        }).then((stations) => {
          setNearbyStation(stations[0] ?? null);
          setLocationState('available');
        }).catch(() => setLocationState('unavailable'));
      },
      () => setLocationState('unavailable'),
    );
  }, []);

  const lastTrip = useMemo(() => history?.content[0] ?? null, [history]);
  const activeTripSummary = tripSummaryValue(isLoading, activeTrip);
  const nearbyBikesSummary = nearbyBikesSummaryValue(locationState, nearbyStation);
  const historySummary = historySummaryValue(isLoading, history);

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Mi movilidad"
        subtitle="Tu actividad, las estaciones cercanas y los accesos principales en un solo lugar."
        action={<Badge className={classes.statusBadge}>Servicio operativo</Badge>}
      />

      <MobilityNavigation />

      {hasSummaryError ? (
        <Alert color="orange" icon={<CircleAlert size={18} />} title="Parte del resumen no está disponible">
          Podés seguir usando las funciones de Movilidad. Reintentaremos los datos cuando vuelvas a ingresar.
        </Alert>
      ) : null}

      <ActiveTripCard activeTrip={activeTrip} isLoading={isLoading} />

      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <SummaryCard icon={Route} label="Viaje actual" tone="blue" value={activeTripSummary} />
        <SummaryCard icon={Navigation} label="Estación más cercana" tone="green" value={locationSummary(locationState, nearbyStation)} />
        <SummaryCard icon={Bike} label="Bicicletas cerca" tone="sky" value={nearbyBikesSummary} />
        <SummaryCard icon={History} label="Viajes realizados" tone="amber" value={historySummary} />
      </SimpleGrid>

      <section aria-labelledby="quick-actions-title">
        <Group justify="space-between" mb="sm">
          <div>
            <Title className={classes.sectionTitle} id="quick-actions-title" order={2}>Acciones rápidas</Title>
            <Text c="dimmed" size="sm">Accedé directamente a las tareas más frecuentes.</Text>
          </div>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
          {quickActions.map((action) => <QuickActionCard action={action} key={action.path} />)}
        </SimpleGrid>
      </section>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <RecentTripCard trip={lastTrip} isLoading={isLoading} />
        <NearbyStationCard locationState={locationState} station={nearbyStation} stationCount={stationCount} />
      </SimpleGrid>
    </Stack>
  );
}

function ActiveTripCard({ activeTrip, isLoading }: Readonly<{ activeTrip: TripResponse | null; isLoading: boolean }>) {
  if (isLoading) {
    return (
      <Paper className={classes.heroCard} radius="lg" p="xl">
        <Group gap="md"><Loader color="white" /><Text c="white">Consultando tu viaje actual...</Text></Group>
      </Paper>
    );
  }

  if (!activeTrip) {
    return (
      <Paper className={`${classes.heroCard} ${classes.heroIdle}`} radius="lg" p="xl">
        <div className={classes.heroDecoration} aria-hidden="true"><Bike size={116} strokeWidth={1.2} /></div>
        <Stack className={classes.heroContent} gap="sm">
          <Badge className={classes.heroBadge}>Listo para comenzar</Badge>
          <Title className={classes.heroTitle} order={2}>No tenés un viaje en curso</Title>
          <Text className={classes.heroText}>Encontrá una bicicleta disponible y empezá tu próximo recorrido por la ciudad.</Text>
          <Group mt="xs">
            <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/estaciones" />} className={classes.heroPrimaryButton} variant="white">Buscar estación</Button>
            <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/mapa" />} className={classes.heroSecondaryButton} variant="outline">Ver mapa</Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper className={`${classes.heroCard} ${classes.heroActive}`} radius="lg" p="xl">
      <div className={classes.heroDecoration} aria-hidden="true"><Route size={116} strokeWidth={1.2} /></div>
      <Stack className={classes.heroContent} gap="sm">
        <Badge className={classes.activeBadge}>Viaje activo</Badge>
        <Title className={classes.heroTitle} order={2}>{activeTrip.bikeCode} está en uso</Title>
        <Group className={classes.tripMeta} gap="lg" wrap="wrap">
          <Text><MapPin size={17} /> {activeTrip.originStationName}</Text>
          <Text><Clock3 size={17} /> Iniciado {formatDateTime(activeTrip.startedAt)}</Text>
        </Group>
        <Group mt="xs">
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/bicicletas" />} className={classes.heroPrimaryButton} variant="white">Ver viaje activo</Button>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/reportes" />} className={classes.heroSecondaryButton} variant="outline">Reportar problema</Button>
        </Group>
      </Stack>
    </Paper>
  );
}

function SummaryCard({ icon: Icon, label, tone, value }: Readonly<{ icon: QuickAction['icon']; label: string; tone: Tone; value: string }>) {
  const summaryToneClass = toneClass(tone);

  return (
    <Paper className={`${classes.summaryCard} ${summaryToneClass}`} radius="md" p="md">
      <div className={classes.summaryIcon}><Icon size={21} /></div>
      <Text className={classes.summaryLabel}>{label}</Text>
      <Text className={classes.summaryValue}>{value}</Text>
    </Paper>
  );
}

function QuickActionCard({ action }: Readonly<{ action: QuickAction }>) {
  const Icon = action.icon;
  const actionToneClass = toneClass(action.tone);
  return (
    <NavLink className={classes.quickActionLink} to={action.path}>
      <Paper className={`${classes.quickAction} ${actionToneClass}`} radius="md" p="md">
        <Group align="flex-start" justify="space-between" wrap="nowrap">
          <div className={classes.quickActionIcon}><Icon size={21} /></div>
          <ArrowRight className={classes.quickActionArrow} size={18} />
        </Group>
        <Text className={classes.quickActionTitle}>{action.label}</Text>
        <Text c="dimmed" size="sm">{action.description}</Text>
      </Paper>
    </NavLink>
  );
}

function RecentTripCard({ trip, isLoading }: Readonly<{ trip: TripResponse | null; isLoading: boolean }>) {
  return (
    <Paper className={classes.detailCard} radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div><Text className={classes.eyebrow}>Actividad reciente</Text><Title className={classes.detailTitle} order={2}>Último viaje</Title></div>
        <div className={`${classes.detailIcon} ${classes.detailIconBlue}`}><History size={22} /></div>
      </Group>
      {isLoading ? <div className={classes.detailBody}><Loader color="citypassUrbanBlue" size="sm" /></div> : null}
      {!isLoading && !trip ? (
        <Stack className={classes.detailBody} gap="sm">
          <Text c="dimmed">Todavía no tenés viajes finalizados.</Text>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/bicicletas" />} className={classes.inlineButton} rightSection={<ArrowRight size={16} />} variant="subtle">Iniciar un viaje</Button>
        </Stack>
      ) : null}
      {!isLoading && trip ? (
        <Stack className={classes.detailBody} gap="sm">
          <Text className={classes.routeText}>{trip.originStationName} <span>→</span> {trip.destinationStationName ?? 'Sin destino informado'}</Text>
          <Group className={classes.detailMetrics} gap="sm" wrap="wrap">
            <DetailMetric label="Fecha" value={formatDateTime(trip.startedAt)} />
            <DetailMetric label="Duración" value={formatDuration(trip.durationSeconds)} />
            <DetailMetric label="Bicicleta" value={trip.bikeCode} />
          </Group>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/historial" />} className={classes.inlineButton} rightSection={<ArrowRight size={16} />} variant="subtle">Ver historial completo</Button>
        </Stack>
      ) : null}
    </Paper>
  );
}

function NearbyStationCard({ locationState, station, stationCount }: Readonly<{ locationState: LocationState; station: NearbyStation | null; stationCount: number | null }>) {
  return (
    <Paper className={classes.detailCard} radius="md" p="lg">
      <Group justify="space-between" mb="md">
        <div><Text className={classes.eyebrow}>Cerca tuyo</Text><Title className={classes.detailTitle} order={2}>Estación recomendada</Title></div>
        <div className={`${classes.detailIcon} ${classes.detailIconGreen}`}><MapPin size={22} /></div>
      </Group>
      {locationState === 'loading' ? <Group className={classes.detailBody} align="flex-start" gap="sm"><Loader color="citypassUrbanGreen" size="sm" /><Text c="dimmed">Buscando estaciones cercanas...</Text></Group> : null}
      {locationState === 'unavailable' ? (
        <Stack className={classes.detailBody} gap="sm">
          <Text c="dimmed">Permití el acceso a tu ubicación para recibir una recomendación cercana.</Text>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/mapa" />} className={classes.inlineButton} rightSection={<ArrowRight size={16} />} variant="subtle">Ver mapa de estaciones</Button>
        </Stack>
      ) : null}
      {locationState === 'available' && !station ? (
        <Stack className={classes.detailBody} gap="sm">
          <Text c="dimmed">No encontramos estaciones dentro del radio cercano. Hay {stationCount ?? 0} registradas para consultar en el mapa.</Text>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/mapa" />} className={classes.inlineButton} rightSection={<ArrowRight size={16} />} variant="subtle">Ver todas las estaciones</Button>
        </Stack>
      ) : null}
      {station ? (
        <Stack className={classes.detailBody} gap="sm">
          <div><Text className={classes.routeText}>{station.stationName}</Text><Text c="dimmed" size="sm">{station.address}</Text></div>
          <Group className={classes.detailMetrics} gap="sm" wrap="wrap">
            <DetailMetric label="Distancia" value={formatDistance(station.distanceMeters)} />
            <DetailMetric label="Bicicletas" value={String(station.availableBikes)} />
            <DetailMetric label="Espacios" value={String(station.availableSlots)} />
          </Group>
          <Button renderRoot={(props) => <NavLink {...props} to="/movilidad/mapa" />} className={classes.inlineButton} rightSection={<ArrowRight size={16} />} variant="subtle">Ubicar en el mapa</Button>
        </Stack>
      ) : null}
    </Paper>
  );
}

function DetailMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><Text className={classes.metricValue}>{value}</Text><Text c="dimmed" size="xs">{label}</Text></div>;
}

function locationSummary(state: LocationState, station: NearbyStation | null) {
  if (state === 'loading') return 'Buscando...';
  if (state === 'unavailable') return 'Activá ubicación';
  return station ? formatDistance(station.distanceMeters) : 'Sin estaciones cerca';
}

function tripSummaryValue(isLoading: boolean, activeTrip: TripResponse | null) {
  if (isLoading) return 'Cargando...';
  return activeTrip ? 'En curso' : 'Sin viaje activo';
}

function nearbyBikesSummaryValue(locationState: LocationState, station: NearbyStation | null) {
  if (station) return String(station.availableBikes);
  return locationState === 'loading' ? 'Buscando...' : '—';
}

function historySummaryValue(isLoading: boolean, history: PagedResponse<TripResponse> | null) {
  if (history) return String(history.totalElements);
  return isLoading ? 'Cargando...' : '—';
}

function toneClass(tone: Tone) {
  return classes[`tone${capitalize(tone)}`];
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return 'Sin información';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
