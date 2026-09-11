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
  Title,
} from '@mantine/core';
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { stationService } from '../../services/stations/stationService';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
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
    <Stack gap="lg">
      <div>
        <Title className={classes.title} order={1}>
          Estaciones
        </Title>
      </div>

      <MobilityNavigation />

      {isLoading ? <LoadingState /> : null}
      {hasError ? <ErrorState onRetry={retry} /> : null}
      {!isLoading && !hasError && stations.length === 0 ? <EmptyState /> : null}
      {!isLoading && !hasError && stations.length > 0 ? (
        <>
          <StationsTable
            onSelectStation={selectStation}
            selectedStationId={selectedStationId}
            stations={stations}
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

type ErrorStateProps = {
  onRetry: () => void;
};

function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudieron cargar las estaciones">
      <Group justify="space-between" align="center" mt="xs">
        <Text size="sm">Verificá que el backend esté disponible e intentá nuevamente.</Text>
        <Button leftSection={<RefreshCw size={16} />} variant="light" onClick={onRetry}>
          Reintentar
        </Button>
      </Group>
    </Alert>
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
  selectedStationId: number | null;
  stations: Station[];
};

function StationsTable({ onSelectStation, selectedStationId, stations }: StationsTableProps) {
  const rows = stations.map((station) => (
    <Table.Tr className={station.id === selectedStationId ? classes.selectedRow : undefined} key={station.id}>
      <Table.Td>
        <Text fw={700}>{station.name}</Text>
      </Table.Td>
      <Table.Td>{station.address || 'Sin dirección informada'}</Table.Td>
      <Table.Td>
        {station.latitude}, {station.longitude}
      </Table.Td>
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
      <Group justify="space-between" mb="md">
        <Text fw={700}>Estaciones</Text>
        <Badge variant="light" color="citypassUrbanBlue">
          {stations.length}
        </Badge>
      </Group>
      <ScrollArea>
        <Table className={classes.table} highlightOnHover miw={880} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Coordenadas</Table.Th>
              <Table.Th>Capacidad</Table.Th>
              <Table.Th>Estado</Table.Th>
              <Table.Th aria-label="Disponibilidad" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
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
