import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  NativeSelect,
  Paper,
  Radio,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { isAxiosError } from 'axios';
import { AlertCircle, Bike, Play, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { currentUserId } from '../../config/currentUser';
import { bikeService } from '../../services/bikes/bikeService';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import type { BikeResponse } from '../../types/bike';
import type { Station } from '../../types/station';
import type { TripResponse } from '../../types/trip';

import classes from './Bicycles.module.css';

export function BicyclesPage() {
  return (
    <Stack gap="lg">
      <div>
        <Title className={classes.title} order={1}>Bicicletas y viajes</Title>
        <Text className={classes.subtitle}>Elegí una estación y una bicicleta disponible para iniciar tu viaje.</Text>
      </div>

      <MobilityNavigation />

      {currentUserId === null ? <MissingUserConfiguration /> : <TripManager userId={currentUserId} />}
    </Stack>
  );
}

function MissingUserConfiguration() {
  return (
    <Alert color="orange" icon={<AlertCircle size={18} />} title="Falta configurar el usuario temporal">
      Configurá VITE_DEMO_USER_ID con el ID de un usuario existente en el backend para consultar o iniciar viajes.
    </Alert>
  );
}

type TripManagerProps = {
  userId: number;
};

function TripManager({ userId }: TripManagerProps) {
  const [activeTrip, setActiveTrip] = useState<TripResponse | null>(null);
  const [isLoadingActiveTrip, setIsLoadingActiveTrip] = useState(true);
  const [activeTripError, setActiveTripError] = useState<string | null>(null);

  const loadActiveTrip = useCallback(async () => {
    setIsLoadingActiveTrip(true);
    setActiveTripError(null);

    try {
      setActiveTrip(await tripService.getActive(userId));
    } catch (error) {
      setActiveTripError(activeTripErrorMessage(error));
    } finally {
      setIsLoadingActiveTrip(false);
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(loadActiveTrip);
  }, [loadActiveTrip]);

  if (isLoadingActiveTrip) {
    return <LoadingPanel message="Consultando tu viaje activo..." />;
  }

  if (activeTripError) {
    return (
      <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo consultar el viaje activo">
        <Stack gap="sm">
          <Text size="sm">{activeTripError}</Text>
          <Button leftSection={<RefreshCw size={16} />} variant="light" onClick={() => void loadActiveTrip()}>
            Reintentar
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (activeTrip) {
    return <ActiveTripPanel trip={activeTrip} />;
  }

  return <StartTripFlow userId={userId} onTripStarted={setActiveTrip} />;
}

type StartTripFlowProps = {
  onTripStarted: (trip: TripResponse) => void;
  userId: number;
};

function StartTripFlow({ onTripStarted, userId }: StartTripFlowProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [stationsError, setStationsError] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [bikes, setBikes] = useState<BikeResponse[]>([]);
  const [isLoadingBikes, setIsLoadingBikes] = useState(false);
  const [bikesError, setBikesError] = useState<string | null>(null);
  const [selectedBikeId, setSelectedBikeId] = useState<number | null>(null);
  const [isStartingTrip, setIsStartingTrip] = useState(false);
  const [startTripError, setStartTripError] = useState<string | null>(null);

  const loadStations = useCallback(async () => {
    setIsLoadingStations(true);
    setStationsError(false);

    try {
      setStations(await stationService.getAll());
    } catch {
      setStationsError(true);
    } finally {
      setIsLoadingStations(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadStations);
  }, [loadStations]);

  const selectStation = async (value: string) => {
    const stationId = Number(value);
    setSelectedStationId(Number.isSafeInteger(stationId) && stationId > 0 ? stationId : null);
    setBikes([]);
    setBikesError(null);
    setSelectedBikeId(null);
    setStartTripError(null);

    if (!Number.isSafeInteger(stationId) || stationId <= 0) {
      return;
    }

    setIsLoadingBikes(true);
    try {
      setBikes(await bikeService.getAvailable(stationId));
    } catch (error) {
      setBikesError(availableBikesErrorMessage(error));
    } finally {
      setIsLoadingBikes(false);
    }
  };

  const startTrip = async () => {
    if (selectedBikeId === null) {
      return;
    }

    setIsStartingTrip(true);
    setStartTripError(null);

    try {
      onTripStarted(await tripService.start(userId, { bikeId: selectedBikeId }));
    } catch (error) {
      setStartTripError(startTripErrorMessage(error));
    } finally {
      setIsStartingTrip(false);
    }
  };

  if (isLoadingStations) {
    return <LoadingPanel message="Cargando estaciones..." />;
  }

  if (stationsError) {
    return (
      <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar las estaciones">
        <Stack gap="sm">
          <Text size="sm">Verificá que el backend esté disponible e intentá nuevamente.</Text>
          <Button leftSection={<RefreshCw size={16} />} variant="light" onClick={() => void loadStations()}>
            Reintentar
          </Button>
        </Stack>
      </Alert>
    );
  }

  if (stations.length === 0) {
    return (
      <Paper className={classes.statePanel} radius="md" p="xl">
        <Stack align="center" gap="xs">
          <Bike className={classes.emptyIcon} size={32} />
          <Title className={classes.emptyTitle} order={2}>No hay estaciones disponibles</Title>
          <Text c="dimmed" ta="center">Cuando el backend disponga de estaciones, podrás iniciar un viaje desde esta pantalla.</Text>
        </Stack>
      </Paper>
    );
  }

  return (
    <Stack gap="md">
      <Paper className={classes.selectionPanel} radius="md" p="md">
        <Stack gap="sm">
          <div>
            <Title className={classes.sectionTitle} order={2}>Iniciar viaje</Title>
            <Text c="dimmed" size="sm">Seleccioná la estación desde la que vas a retirar una bicicleta.</Text>
          </div>
          <NativeSelect
            aria-label="Estación de origen"
            onChange={(event) => void selectStation(event.currentTarget.value)}
            value={selectedStationId?.toString() ?? ''}
          >
            <option value="">Seleccioná una estación</option>
            {stations.map((station) => (
              <option key={station.id} value={station.id}>
                {station.name}{station.address ? ` - ${station.address}` : ''}
              </option>
            ))}
          </NativeSelect>
        </Stack>
      </Paper>

      {selectedStationId !== null && isLoadingBikes ? <LoadingPanel message="Cargando bicicletas disponibles..." /> : null}
      {bikesError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar las bicicletas">{bikesError}</Alert> : null}
      {selectedStationId !== null && !isLoadingBikes && !bikesError && bikes.length === 0 ? (
        <Alert color="orange" icon={<Bike size={18} />} title="No hay bicicletas disponibles">
          La estación seleccionada no tiene bicicletas disponibles en este momento.
        </Alert>
      ) : null}
      {bikes.length > 0 ? (
        <Paper className={classes.selectionPanel} radius="md" p="md">
          <Stack gap="md">
            <div>
              <Title className={classes.sectionTitle} order={2}>Bicicletas disponibles</Title>
              <Text c="dimmed" size="sm">Elegí una bicicleta para iniciar tu viaje.</Text>
            </div>
            <Radio.Group
              aria-label="Bicicleta disponible"
              onChange={(value) => setSelectedBikeId(Number(value))}
              value={selectedBikeId?.toString() ?? ''}
            >
              <Stack gap="xs">
                {bikes.map((bike) => (
                  <Paper className={classes.bikeOption} key={bike.id} radius="sm" p="sm">
                    <Radio value={bike.id.toString()} label={bike.model ? `${bike.code} - ${bike.model}` : bike.code} />
                  </Paper>
                ))}
              </Stack>
            </Radio.Group>
            {startTripError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo iniciar el viaje">{startTripError}</Alert> : null}
            <Button
              disabled={selectedBikeId === null}
              leftSection={<Play size={16} />}
              loading={isStartingTrip}
              onClick={() => void startTrip()}
            >
              Iniciar viaje
            </Button>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}

type ActiveTripPanelProps = {
  trip: TripResponse;
};

function ActiveTripPanel({ trip }: ActiveTripPanelProps) {
  return (
    <Paper className={classes.activeTripPanel} radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title className={classes.sectionTitle} order={2}>Tenés un viaje activo</Title>
            <Text c="dimmed" size="sm">La finalización del viaje estará disponible en una próxima etapa.</Text>
          </div>
          <Badge color="citypassUrbanGreen" variant="filled">{trip.status}</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TripMetric label="Bicicleta" value={trip.bikeCode} />
          <TripMetric label="Estación de origen" value={trip.originStationName} />
          <TripMetric label="Inicio" value={formatDateTime(trip.startedAt)} />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

type TripMetricProps = {
  label: string;
  value: string;
};

function TripMetric({ label, value }: TripMetricProps) {
  return (
    <div className={classes.tripMetric}>
      <Text className={classes.metricLabel}>{label}</Text>
      <Text className={classes.metricValue}>{value}</Text>
    </div>
  );
}

function LoadingPanel({ message }: { message: string }) {
  return (
    <Paper className={classes.statePanel} radius="md" p="xl">
      <Stack align="center" gap="sm">
        <Loader color="citypassUrbanBlue" />
        <Text c="dimmed">{message}</Text>
      </Stack>
    </Paper>
  );
}

function activeTripErrorMessage(error: unknown) {
  return statusOf(error) === 404
    ? 'El usuario configurado no existe en el backend.'
    : 'No fue posible obtener el estado de tu viaje. Intentá nuevamente.';
}

function availableBikesErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 404) {
    return 'La estación seleccionada ya no está disponible.';
  }
  if (status === 409) {
    return 'La estación seleccionada no está activa para retirar bicicletas.';
  }
  return 'No fue posible consultar las bicicletas disponibles. Intentá nuevamente.';
}

function startTripErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 400) {
    return 'La solicitud para iniciar el viaje no es válida.';
  }
  if (status === 404) {
    return 'La bicicleta seleccionada o el usuario no están disponibles.';
  }
  if (status === 409) {
    return 'No podés iniciar el viaje porque ya tenés uno activo o la bicicleta dejó de estar disponible.';
  }
  return 'No fue posible iniciar el viaje. Intentá nuevamente.';
}

function statusOf(error: unknown) {
  return isAxiosError(error) ? error.response?.status : undefined;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
