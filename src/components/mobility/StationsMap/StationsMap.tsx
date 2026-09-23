import 'leaflet/dist/leaflet.css';

import { Alert, Group, Loader, Paper, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { divIcon } from 'leaflet';
import { CircleMarker, MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { AlertCircle, Bike, MapPin, Navigation, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { stationService } from '../../../services/stations/stationService';
import type { NearbyStation } from '../../../types/nearbyStation';
import type { Station } from '../../../types/station';
import type { StationAvailability } from '../../../types/stationAvailability';
import type { StationRecommendation } from '../../../types/stationRecommendation';

import classes from './StationsMap.module.css';

type Coordinates = [number, number];

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

function createStationIcon(isSelected: boolean, isRecommended: boolean) {
  return divIcon({
    className: classes.stationMarkerHost,
    html: `<span class="${classes.stationMarker}${isSelected ? ` ${classes.stationMarkerSelected}` : ''}${isRecommended ? ` ${classes.stationMarkerRecommended}` : ''}" aria-hidden="true"><svg viewBox="0 0 24 24" role="img"><circle cx="6" cy="17" r="3.25"/><circle cx="18" cy="17" r="3.25"/><path d="m6 17 4-7 3 7m-7 0h7l4-7m-8 0h4m-5-3h3"/></svg></span>`,
    iconAnchor: [22, 22],
    iconSize: [44, 44],
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

type StationsMapProps = {
  showHeading?: boolean;
};

export function StationsMap({ showHeading = true }: StationsMapProps) {
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [stations, setStations] = useState<MapStation[]>([]);
  const [isGeolocationLoading, setIsGeolocationLoading] = useState(true);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);
  const [isBackendLoading, setIsBackendLoading] = useState(false);
  const [backendError, setBackendError] = useState(false);
  const [selectedStation, setSelectedStation] = useState<MapStation | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<StationAvailability | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [hasAvailabilityError, setHasAvailabilityError] = useState(false);
  const [recommendation, setRecommendation] = useState<StationRecommendation | null>(null);
  const [isRecommendationLoading, setIsRecommendationLoading] = useState(false);
  const [hasRecommendationError, setHasRecommendationError] = useState(false);

  useEffect(() => {
    const loadFallbackStations = async () => {
      setIsBackendLoading(true);
      setBackendError(false);

      try {
        const fallbackStations = await stationService.getAll();
        setStations(fallbackStations.map(toRegisteredMapStation));
      } catch {
        setBackendError(true);
      } finally {
        setIsBackendLoading(false);
      }
    };

    const loadNearbyStations = async (location: Coordinates) => {
      setIsBackendLoading(true);
      setBackendError(false);

      try {
        const [registeredStations, nearbyStations] = await Promise.all([
          stationService.getAll(),
          stationService.getNearby({ lat: location[0], lng: location[1] }),
        ]);
        const nearbyById = new Map(
          nearbyStations.map((station) => [station.stationId, toNearbyMapStation(station)]),
        );

        setStations(registeredStations.map(
          (station) => nearbyById.get(station.id) ?? toRegisteredMapStation(station),
        ));
      } catch {
        setBackendError(true);
      } finally {
        setIsBackendLoading(false);
      }
    };

    const loadRecommendation = async (location: Coordinates) => {
      setIsRecommendationLoading(true);
      setHasRecommendationError(false);
      try {
        setRecommendation(await stationService.getRecommendation(location[0], location[1], 'PICKUP'));
      } catch {
        setHasRecommendationError(true);
      } finally {
        setIsRecommendationLoading(false);
      }
    };

    const showFallback = (message: string) => {
      setGeolocationError(message);
      setIsGeolocationLoading(false);
      void loadFallbackStations();
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
        void loadNearbyStations(location);
        void loadRecommendation(location);
      },
      () => {
        showFallback('No se pudo obtener tu ubicación. Se muestran todas las estaciones registradas.');
      },
    );
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

  const firstStationCenter: Coordinates | null = stations[0]
    ? [stations[0].latitude, stations[0].longitude]
    : null;
  const mapCenter = userLocation ?? firstStationCenter;
  const nearbyStations = stations.filter((station) => station.distanceMeters !== null);
  const recommendedStationId = recommendation?.status === 'RECOMMENDED' ? recommendation.station?.stationId : null;

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

      {isGeolocationLoading ? <LoadingState message="Obteniendo tu ubicación..." /> : null}
      {geolocationError ? <Alert color="orange" icon={<AlertCircle size={18} />} title="Ubicación no disponible">{geolocationError}</Alert> : null}
      {isBackendLoading ? <LoadingState message="Cargando estaciones..." /> : null}
      {backendError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar las estaciones">Verificá la conexión con el backend e intentá nuevamente.</Alert> : null}

      {!isGeolocationLoading && !isBackendLoading && !backendError ? (
        <div className={classes.mapLayout}>
          <Paper className={classes.mapPanel} radius="md" p={0}>
            {mapCenter ? (
              <MapContainer center={mapCenter} className={classes.map} zoom={14}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapViewport center={mapCenter} />
                {userLocation ? (
                  <CircleMarker center={userLocation} className={classes.userMarker} pathOptions={{ color: '#2F5CA6', fillColor: '#2F5CA6', fillOpacity: 1 }} radius={8}>
                    <Tooltip direction="top">Tu ubicación</Tooltip>
                  </CircleMarker>
                ) : null}
                {stations.map((station) => (
                  <Marker
                    eventHandlers={{ click: () => void selectStation(station) }}
                    icon={createStationIcon(selectedStation?.id === station.id, recommendedStationId === station.id)}
                    key={station.id}
                    position={[station.latitude, station.longitude]}
                  >
                    <Tooltip direction="top">{station.name}</Tooltip>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <EmptyMapState />
            )}
          </Paper>

          <Stack gap="md">
          <RecommendationPanel error={hasRecommendationError} loading={isRecommendationLoading} recommendation={recommendation} />
          <StationDetails
            availability={selectedAvailability}
            hasAvailabilityError={hasAvailabilityError}
            isAvailabilityLoading={isAvailabilityLoading}
            station={selectedStation}
          />
          {userLocation ? <NearbyStations stations={nearbyStations} onSelectStation={selectStation} /> : null}
          </Stack>
        </div>
      ) : null}

    </Stack>
  );
}

function RecommendationPanel({ error, loading, recommendation }: { error: boolean; loading: boolean; recommendation: StationRecommendation | null }) {
  if (loading) return <Paper className={classes.recommendationPanel} radius="md" p="md"><Group gap="sm"><Loader size="sm" /><Text size="sm">Buscando la mejor estación para retirar una bicicleta...</Text></Group></Paper>;
  if (error) return <Alert color="gray" title="Recomendación no disponible">Podés continuar usando el mapa y elegir cualquier estación.</Alert>;
  if (!recommendation) return null;
  if (recommendation.status === 'NO_RECOMMENDATION') return <Alert color="blue" title="Sin recomendación disponible">{recommendation.message}</Alert>;
  if (!recommendation.station) return null;

  const isModel = recommendation.source === 'MODEL';
  const title = isModel ? 'Estación recomendada' : 'Alternativa recomendada disponible';
  return <Paper className={classes.recommendationPanel} radius="md" p="md"><Stack gap="xs">
    <Group gap="xs">{isModel ? <Sparkles size={18} /> : <MapPin size={18} />}<Text fw={700}>{title}</Text></Group>
    <Text fw={700}>{recommendation.station.stationName}</Text>
    {recommendation.station.address ? <Text c="dimmed" size="sm">{recommendation.station.address}</Text> : null}
    <Group gap="md"><Text size="sm">{recommendation.station.distanceMeters} m</Text><Text size="sm">{recommendation.station.availableBikes} bicicletas</Text><Text size="sm">{recommendation.station.availableSlots} espacios</Text></Group>
    <Text size="sm">{recommendation.message}</Text>
  </Stack></Paper>;
}

function MapViewport({ center }: { center: Coordinates }) {
  const map = useMap();

  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  return null;
}

function LoadingState({ message }: { message: string }) {
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

type StationDetailsProps = {
  availability: StationAvailability | null;
  hasAvailabilityError: boolean;
  isAvailabilityLoading: boolean;
  station: MapStation | null;
};

function StationDetails({ availability, hasAvailabilityError, isAvailabilityLoading, station }: StationDetailsProps) {
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

        <div className={classes.metrics}>
          <Metric label="Capacidad" value={station.capacity} />
          {station.distanceMeters !== null ? <Metric label="Distancia" value={`${station.distanceMeters} m`} /> : null}
          {availableBikes !== undefined && availableBikes !== null ? <Metric label="Bicicletas disponibles" value={availableBikes} /> : null}
          {availableSlots !== undefined && availableSlots !== null ? <Metric label="Espacios disponibles" value={availableSlots} /> : null}
        </div>

        {isAvailabilityLoading ? <Group gap="sm"><Loader color="citypassUrbanBlue" size="sm" /><Text c="dimmed" size="sm">Consultando disponibilidad...</Text></Group> : null}
        {hasAvailabilityError ? <Alert color="red" title="No se pudo consultar la disponibilidad">La estación seleccionada no está disponible o ocurrió un error al consultar el backend.</Alert> : null}
        {availableBikes === 0 ? (
          <div className={classes.unavailableNotice} role="status">
            <Bike size={20} />
            <div>
              <Text fw={750} size="sm">No hay bicicletas disponibles</Text>
              <Text size="xs">Esta estación no cuenta con bicicletas disponibles en este momento.</Text>
            </div>
          </div>
        ) : null}
      </Stack>
    </Paper>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className={classes.metric}>
      <Text className={classes.metricValue}>{value}</Text>
      <Text c="dimmed" size="sm">{label}</Text>
    </div>
  );
}

type NearbyStationsProps = {
  onSelectStation: (station: MapStation) => void;
  stations: MapStation[];
};

function NearbyStations({ onSelectStation, stations }: NearbyStationsProps) {
  return (
    <Paper className={classes.nearbyPanel} radius="md" p="md">
      <Title className={classes.nearbyTitle} order={2}>Estaciones cercanas</Title>
      {stations.length === 0 ? (
        <Text c="dimmed" mt="xs" size="sm">No se encontraron estaciones activas dentro del radio de búsqueda.</Text>
      ) : (
        <Stack gap="xs" mt="sm">
          {stations.map((station) => (
            <UnstyledButton aria-label={`Seleccionar ${station.name}`} className={classes.nearbyStation} key={station.id} onClick={() => void onSelectStation(station)}>
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
