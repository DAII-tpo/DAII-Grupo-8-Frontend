import {
  Alert,
  Badge,
  Button,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { AlertCircle, MapPin, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { stationService } from '../../services/stations/stationService';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import pageClasses from '../../styles/mobilityPage.module.css';
import type { Station, StationStatus } from '../../types/station';
import type { StationAvailability } from '../../types/stationAvailability';

import classes from './Stations.module.css';

const statusLabels: Record<StationStatus, string> = {
  ACTIVE: 'Activa',
  INACTIVE: 'Inactiva',
  MAINTENANCE: 'En mantenimiento',
};

export function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [availability, setAvailability] = useState<StationAvailability | null>(null);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [hasAvailabilityError, setHasAvailabilityError] = useState(false);

  const loadStations = useCallback(async () => {
    try {
      setStations(await stationService.getAll());
      setHasError(false);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadStations);
  }, [loadStations]);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((position) => {
      setUserLocation([position.coords.latitude, position.coords.longitude]);
    });
  }, []);

  const visibleStations = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('es');

    return stations
      .map((station) => ({
        ...station,
        distanceMeters: userLocation
          ? calculateDistanceMeters(userLocation, [station.latitude, station.longitude])
          : null,
      }))
      .filter((station) => (
        normalizedQuery === ''
        || station.name.toLocaleLowerCase('es').includes(normalizedQuery)
        || station.address.toLocaleLowerCase('es').includes(normalizedQuery)
      ))
      .sort((first, second) => {
        if (first.distanceMeters !== null && second.distanceMeters !== null) {
          return first.distanceMeters - second.distanceMeters;
        }

        return first.name.localeCompare(second.name, 'es');
      });
  }, [searchQuery, stations, userLocation]);

  const retry = () => {
    setHasError(false);
    setIsLoading(true);
    void loadStations();
  };

  const selectStation = async (stationId: number) => {
    setSelectedStationId(stationId);
    setAvailability(null);
    setHasAvailabilityError(false);
    setIsAvailabilityLoading(true);

    try {
      setAvailability(await stationService.getAvailability(stationId));
    } catch {
      setHasAvailabilityError(true);
    } finally {
      setIsAvailabilityLoading(false);
    }
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Estaciones"
        subtitle="Consultá el estado, la ubicación y la disponibilidad de cada estación."
      />

      <MobilityNavigation />

      {isLoading ? <LoadingState /> : null}
      {hasError ? <RetryErrorAlert message="Verificá que el backend esté disponible e intentá nuevamente." onRetry={retry} title="No se pudieron cargar las estaciones" /> : null}
      {!isLoading && !hasError && stations.length === 0 ? <EmptyState /> : null}
      {!isLoading && !hasError && stations.length > 0 ? (
        <>
          <StationsTable
            onSelectStation={selectStation}
            onSearchChange={setSearchQuery}
            searchQuery={searchQuery}
            selectedStationId={selectedStationId}
            stations={visibleStations}
            totalStations={stations.length}
            userLocationAvailable={userLocation !== null}
          />
          <AvailabilityPanel
            availability={availability}
            hasError={hasAvailabilityError}
            isLoading={isAvailabilityLoading}
            selectedStationId={selectedStationId}
          />
        </>
      ) : null}
    </Stack>
  );
}

function LoadingState() {
  return (
    <Paper className={classes.statePanel} radius="md" p="xl">
      <Stack align="center" gap="sm">
        <Loader color="citypassUrbanBlue" />
        <Text c="dimmed">Cargando estaciones...</Text>
      </Stack>
    </Paper>
  );
}

function EmptyState() {
  return (
    <Paper className={classes.statePanel} radius="md" p="xl">
      <Stack align="center" gap="xs">
        <MapPin className={classes.emptyIcon} size={32} />
        <Title order={2} className={classes.emptyTitle}>
          No hay estaciones registradas
        </Title>
        <Text c="dimmed" ta="center">
          Cuando el backend disponga de estaciones, aparecerán en este directorio.
        </Text>
      </Stack>
    </Paper>
  );
}

type StationsTableProps = {
  onSelectStation: (stationId: number) => void;
  onSearchChange: (query: string) => void;
  searchQuery: string;
  selectedStationId: number | null;
  stations: Array<Station & { distanceMeters: number | null }>;
  totalStations: number;
  userLocationAvailable: boolean;
};

function StationsTable({ onSearchChange, onSelectStation, searchQuery, selectedStationId, stations, totalStations, userLocationAvailable }: StationsTableProps) {
  const rows = stations.map((station) => (
    <Table.Tr className={station.id === selectedStationId ? classes.selectedRow : undefined} key={station.id}>
      <Table.Td>
        <Text fw={700}>{station.name}</Text>
      </Table.Td>
      <Table.Td>{station.address || 'Sin dirección informada'}</Table.Td>
      <Table.Td>{formatDistance(station.distanceMeters)}</Table.Td>
      <Table.Td>{station.capacity}</Table.Td>
      <Table.Td>
        <Badge className={classes[`status${station.status}`]}>{statusLabels[station.status]}</Badge>
      </Table.Td>
      <Table.Td>
        <Button
          aria-label={`Consultar disponibilidad de ${station.name}`}
          onClick={() => void onSelectStation(station.id)}
          size="compact-sm"
          variant="light"
        >
          Ver disponibilidad
        </Button>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Paper className={classes.tablePanel} radius="md" p="md">
      <div className={classes.tableToolbar}>
        <div>
          <Group gap="xs">
            <Text fw={700}>Estaciones</Text>
            <Badge variant="light" color="citypassUrbanBlue">{stations.length} de {totalStations}</Badge>
          </Group>
          <Text c="dimmed" size="xs" mt={4}>
            {userLocationAvailable ? 'Ordenadas desde la más cercana.' : 'Permití el acceso a tu ubicación para ordenarlas por cercanía.'}
          </Text>
        </div>
        <TextInput
          aria-label="Buscar estaciones"
          className={classes.searchInput}
          leftSection={<Search size={16} />}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          placeholder="Buscar por nombre o dirección"
          value={searchQuery}
        />
      </div>
      <ScrollArea>
        <Table className={classes.table} highlightOnHover miw={880} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Cercanía</Table.Th>
              <Table.Th>Capacidad</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th aria-label="Disponibilidad" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
      {stations.length === 0 ? (
        <Stack align="center" className={classes.noResults} gap="xs">
          <Search size={24} />
          <Text fw={700}>No encontramos estaciones</Text>
          <Text c="dimmed" size="sm">Probá buscar con otro nombre o dirección.</Text>
        </Stack>
      ) : null}
    </Paper>
  );
}

function calculateDistanceMeters(origin: [number, number], destination: [number, number]) {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(destination[0] - origin[0]);
  const longitudeDelta = toRadians(destination[1] - origin[1]);
  const originLatitude = toRadians(origin[0]);
  const destinationLatitude = toRadians(destination[0]);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function formatDistance(distanceMeters: number | null) {
  if (distanceMeters === null) return '—';
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

type AvailabilityPanelProps = {
  availability: StationAvailability | null;
  hasError: boolean;
  isLoading: boolean;
  selectedStationId: number | null;
};

function AvailabilityPanel({ availability, hasError, isLoading, selectedStationId }: AvailabilityPanelProps) {
  return (
    <Paper className={classes.availabilityPanel} radius="md" p="md">
      <Title className={classes.availabilityTitle} order={2}>
        Disponibilidad de bicicletas
      </Title>

      {selectedStationId === null ? (
        <Text c="dimmed" mt="xs">
          Seleccioná una estación para consultar su disponibilidad actual.
        </Text>
      ) : null}
      {isLoading ? (
        <Group gap="sm" mt="md">
          <Loader color="citypassUrbanBlue" size="sm" />
          <Text c="dimmed">Consultando disponibilidad...</Text>
        </Group>
      ) : null}
      {hasError ? (
        <Alert color="red" icon={<AlertCircle size={18} />} mt="md" title="No se pudo consultar la disponibilidad">
          La estación seleccionada no está disponible o ocurrió un error al consultar el backend.
        </Alert>
      ) : null}
      {availability ? <AvailabilityDetails availability={availability} /> : null}
    </Paper>
  );
}

type AvailabilityDetailsProps = {
  availability: StationAvailability;
};

function AvailabilityDetails({ availability }: AvailabilityDetailsProps) {
  return (
    <Stack gap="md" mt="md">
      <Group justify="space-between" wrap="wrap">
        <div>
          <Text fw={700}>{availability.stationName}</Text>
          <Text c="dimmed" size="sm">
            Última actualización: {availability.checkedAt}
          </Text>
        </div>
        <Badge className={classes[`status${availability.status}`]}>{statusLabels[availability.status]}</Badge>
      </Group>

      <div className={classes.availabilityMetrics}>
        <AvailabilityMetric label="Capacidad" value={availability.capacity} />
        <AvailabilityMetric label="Bicicletas disponibles" value={availability.availableBikes} />
        <AvailabilityMetric label="Espacios libres" value={availability.availableSlots} />
      </div>

      {availability.availableBikes === 0 ? (
        <Alert color="orange" title="No hay bicicletas disponibles">
          Esta estación no cuenta con bicicletas disponibles en este momento.
        </Alert>
      ) : null}
    </Stack>
  );
}

type AvailabilityMetricProps = {
  label: string;
  value: number;
};

function AvailabilityMetric({ label, value }: AvailabilityMetricProps) {
  return (
    <div className={classes.availabilityMetric}>
      <Text className={classes.metricValue}>{value}</Text>
      <Text c="dimmed" size="sm">
        {label}
      </Text>
    </div>
  );
}
