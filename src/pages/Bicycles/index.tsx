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
import { AlertCircle, Bike, Play } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { bikeService } from '../../services/bikes/bikeService';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import type { BikeResponse } from '../../types/bike';
import type { Station } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';
import type { TripResponse } from '../../types/trip';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './Bicycles.module.css';

export function BicyclesPage() {
  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Bicicletas y viajes"
        subtitle="Elegí una estación y una bicicleta disponible para iniciar tu viaje."
      />

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
  const [completedTrip, setCompletedTrip] = useState<TripResponse | null>(null);
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
      <RetryErrorAlert
        message={activeTripError}
        onRetry={() => void loadActiveTrip()}
        title="No se pudo consultar el viaje activo"
      />
    );
  }

  if (completedTrip) {
    return <CompletedTripPanel onStartAnother={() => {
      setCompletedTrip(null);
      void loadActiveTrip();
    }} trip={completedTrip} />;
  }

  if (activeTrip) {
    return <ActiveTripPanel onTripCompleted={setCompletedTrip} trip={activeTrip} userId={userId} />;
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
      <RetryErrorAlert
        message="Verificá que el backend esté disponible e intentá nuevamente."
        onRetry={() => void loadStations()}
        title="No se pudieron cargar las estaciones"
      />
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
  onTripCompleted: (trip: TripResponse) => void;
  trip: TripResponse;
  userId: number;
};

function ActiveTripPanel({ onTripCompleted, trip, userId }: ActiveTripPanelProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(true);
  const [stationsError, setStationsError] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<StationAvailability | null>(null);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isEndingTrip, setIsEndingTrip] = useState(false);
  const [endTripError, setEndTripError] = useState<string | null>(null);

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

  const selectDestination = async (value: string) => {
    const stationId = Number(value);
    const isValidStationId = Number.isSafeInteger(stationId) && stationId > 0;
    setSelectedStationId(isValidStationId ? stationId : null);
    setAvailability(null);
    setAvailabilityError(null);
    setIsConfirming(false);
    setEndTripError(null);

    if (!isValidStationId) {
      return;
    }

    setIsLoadingAvailability(true);
    try {
      setAvailability(await stationService.getAvailability(stationId));
    } catch (error) {
      setAvailabilityError(availabilityErrorMessage(error));
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  const endTrip = async () => {
    if (selectedStationId === null || availability?.availableSlots === 0) {
      return;
    }

    setIsEndingTrip(true);
    setEndTripError(null);

    try {
      onTripCompleted(await tripService.end(userId, trip.id, { destinationStationId: selectedStationId }));
    } catch (error) {
      setEndTripError(endTripErrorMessage(error));
    } finally {
      setIsEndingTrip(false);
    }
  };

  return (
    <Paper className={classes.activeTripPanel} radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title className={classes.sectionTitle} order={2}>Tenés un viaje activo</Title>
            <Text c="dimmed" size="sm">Seleccioná la estación en la que vas a devolver la bicicleta.</Text>
          </div>
          <Badge color="citypassUrbanGreen" variant="filled">{trip.status}</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TripMetric label="Bicicleta" value={trip.bikeCode} />
          <TripMetric label="Estación de origen" value={trip.originStationName} />
          <TripMetric label="Inicio" value={formatDateTime(trip.startedAt)} />
        </SimpleGrid>

        {isLoadingStations ? <LoadingPanel message="Cargando estaciones destino..." /> : null}
        {stationsError ? (
          <RetryErrorAlert
            message="Verificá que el backend esté disponible e intentá nuevamente."
            onRetry={() => void loadStations()}
            title="No se pudieron cargar las estaciones"
          />
        ) : null}
        {!isLoadingStations && !stationsError && stations.length === 0 ? (
          <Alert color="orange" icon={<AlertCircle size={18} />} title="No hay estaciones destino disponibles">
            No hay estaciones disponibles para devolver la bicicleta en este momento.
          </Alert>
        ) : null}
        {!isLoadingStations && !stationsError && stations.length > 0 ? (
          <Stack gap="md">
            <NativeSelect
              aria-label="Estación destino"
              onChange={(event) => void selectDestination(event.currentTarget.value)}
              value={selectedStationId?.toString() ?? ''}
            >
              <option value="">Seleccioná una estación destino</option>
              {stations.map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name}{station.address ? ` - ${station.address}` : ''}
                </option>
              ))}
            </NativeSelect>

            {selectedStationId === null ? <Text c="dimmed" size="sm">Seleccioná una estación para consultar sus espacios disponibles.</Text> : null}
            {isLoadingAvailability ? <LoadingPanel message="Consultando espacios disponibles..." /> : null}
            {availabilityError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo consultar la disponibilidad">{availabilityError}</Alert> : null}
            {availability ? <DestinationAvailability availability={availability} /> : null}
            {availability?.availableSlots === 0 ? (
              <Alert color="orange" icon={<AlertCircle size={18} />} title="No hay espacios disponibles">
                Esta estación no cuenta con anclajes libres para devolver la bicicleta.
              </Alert>
            ) : null}
            {availability && !isConfirming ? (
              <Button disabled={availability.availableSlots === 0} onClick={() => setIsConfirming(true)}>
                Confirmar devolución
              </Button>
            ) : null}
            {isConfirming && availability && availability.availableSlots > 0 ? (
              <Paper className={classes.confirmationPanel} radius="sm" p="md">
                <Stack gap="sm">
                  <Text fw={700}>Confirmá la devolución en {availability.stationName}</Text>
                  <Text c="dimmed" size="sm">Espacios disponibles: {availability.availableSlots}</Text>
                  {endTripError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo finalizar el viaje">{endTripError}</Alert> : null}
                  <Group>
                    <Button variant="default" onClick={() => setIsConfirming(false)}>Cancelar</Button>
                    <Button color="citypassUrbanGreen" loading={isEndingTrip} onClick={() => void endTrip()}>
                      Finalizar viaje
                    </Button>
                  </Group>
                </Stack>
              </Paper>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function DestinationAvailability({ availability }: { availability: StationAvailability }) {
  return (
    <Paper className={classes.availabilityPanel} radius="sm" p="md">
      <Stack gap="sm">
        <Text fw={700}>{availability.stationName}</Text>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TripMetric label="Capacidad" value={availability.capacity.toString()} />
          <TripMetric label="Bicicletas disponibles" value={availability.availableBikes.toString()} />
          <TripMetric label="Espacios libres" value={availability.availableSlots.toString()} />
        </SimpleGrid>
      </Stack>
    </Paper>
  );
}

type CompletedTripPanelProps = {
  onStartAnother: () => void;
  trip: TripResponse;
};

function CompletedTripPanel({ onStartAnother, trip }: CompletedTripPanelProps) {
  return (
    <Paper className={classes.completedTripPanel} radius="md" p="lg">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <div>
            <Title className={classes.sectionTitle} order={2}>Viaje finalizado</Title>
            <Text c="dimmed" size="sm">La bicicleta fue devuelta correctamente.</Text>
          </div>
          <Badge color="citypassUrbanGreen" variant="filled">{trip.status}</Badge>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="sm">
          <TripMetric label="Bicicleta" value={trip.bikeCode} />
          <TripMetric label="Origen" value={trip.originStationName} />
          <TripMetric label="Destino" value={trip.destinationStationName ?? 'Sin información'} />
          <TripMetric label="Inicio" value={formatDateTime(trip.startedAt)} />
          <TripMetric label="Fin" value={trip.endedAt ? formatDateTime(trip.endedAt) : 'Sin información'} />
          <TripMetric label="Duración" value={formatDuration(trip.durationSeconds)} />
        </SimpleGrid>
        <Button variant="light" onClick={onStartAnother}>Iniciar otro viaje</Button>
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

function availabilityErrorMessage(error: unknown) {
  return statusOf(error) === 404
    ? 'La estación seleccionada ya no está disponible.'
    : 'No fue posible consultar los espacios disponibles. Intentá nuevamente.';
}

function endTripErrorMessage(error: unknown) {
  const status = statusOf(error);
  if (status === 400) {
    return 'La solicitud de devolución no es válida.';
  }
  if (status === 404) {
    return 'El viaje, la estación o los datos asociados ya no están disponibles.';
  }
  if (status === 409) {
    return 'La devolución no puede completarse. Verificá que la estación esté activa y tenga espacios disponibles.';
  }
  return 'No fue posible finalizar el viaje. Intentá nuevamente.';
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

function formatDuration(durationSeconds: number | null) {
  if (durationSeconds === null) {
    return 'Sin información';
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes} min ${seconds} s`;
}
