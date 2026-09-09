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
import type { Station, StationStatus } from '../../types/station';

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

  return (
    <Stack gap="lg">
      <div>
        <Title className={classes.title} order={1}>
          Directorio de estaciones
        </Title>
        <Text className={classes.subtitle}>
          Estaciones registradas en Movilidad Urbana Inteligente.
        </Text>
      </div>

      {isLoading ? <LoadingState /> : null}
      {hasError ? <ErrorState onRetry={retry} /> : null}
      {!isLoading && !hasError && stations.length === 0 ? <EmptyState /> : null}
      {!isLoading && !hasError && stations.length > 0 ? (
        <StationsTable stations={stations} />
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
  stations: Station[];
};

function StationsTable({ stations }: StationsTableProps) {
  const rows = stations.map((station) => (
    <Table.Tr key={station.id}>
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
        <Table className={classes.table} highlightOnHover miw={760} verticalSpacing="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Nombre</Table.Th>
              <Table.Th>Dirección</Table.Th>
              <Table.Th>Coordenadas</Table.Th>
              <Table.Th>Capacidad</Table.Th>
              <Table.Th>Estado</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
