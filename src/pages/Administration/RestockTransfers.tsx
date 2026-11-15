import { Alert, Badge, Button, Checkbox, Group, Modal, NativeSelect, Paper, ScrollArea, Stack, Text, Title } from '@mantine/core';
import { useEffect, useState } from 'react';
import { bikeService } from '../../services/bikes/bikeService';
import { restockService, type EventTransferPlan, type RestockTask } from '../../services/restock/restockService';
import type { BikeResponse } from '../../types/bike';
import classes from './Administration.module.css';

// El encabezado y el menú del sitio usan capas hasta 350.
const CONFIRMATION_MODAL_Z_INDEX = 400;

type Move = EventTransferPlan['transfers'][number];

type Trip = {
  move: Move;
  task: RestockTask;
};

type Props = Readonly<{
  formatError: (error: unknown) => string;
  onTransferred: () => void;
}>;

export function RestockTransfers({ formatError, onTransferred }: Props) {
  const [tasks, setTasks] = useState<RestockTask[] | null>(null);
  const [plans, setPlans] = useState<EventTransferPlan[]>([]);
  const [activityId, setActivityId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [upcoming, currentPlans] = await Promise.all([
        restockService.getUpcoming(),
        restockService.getTransferPlans(),
      ]);
      setTasks(upcoming.filter((task) => task.status === 'PENDING' &&
        (!task.activityChange || task.activityChange.state === 'PROGRAMADA')));
      setPlans(currentPlans);
    } catch (requestError) {
      setError(formatError(requestError));
    } finally {
      setLoading(false);
    }
  };

  const activities = new Map(tasks?.map((task) => [task.activityId, task.activityTitle]));
  const selectedActivity = activities.has(activityId) ? activityId : '';
  const plan = plans.find((item) => item.activityId === selectedActivity);
  const destinationTasks = new Map(tasks?.filter((task) => task.activityId === selectedActivity)
    .map((task) => [task.stationId, task]));
  const trips = (plan?.transfers ?? []).flatMap((move) => {
    const task = destinationTasks.get(move.destinationId);
    return task ? [{ move, task }] : [];
  });

  const onConfirmed = (count: number) => {
    setTrip(null);
    setNotice(count === 1 ? 'Se registró el traslado de 1 bici.' : `Se registró el traslado de ${count} bicis.`);
    // Ocultar el plan anterior hasta que vuelva a calcularse con el stock actualizado.
    setPlans([]);
    onTransferred();
    void refresh();
  };

  return (
    <Paper className={classes.tablePanel} p="md">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={2} className={classes.sectionTitle}>Traslados por actividad</Title>
          <Button variant="light" loading={loading} onClick={() => void refresh()}>
            {tasks ? 'Actualizar planes' : 'Cargar planes de traslado'}
          </Button>
        </Group>
        {notice && <Alert color="green" role="status">{notice}</Alert>}
        {error && <Alert color="red">{error}</Alert>}
        {tasks && activities.size === 0 && !loading && !error &&
          <Text size="sm" c="dimmed">No hay actividades con tareas pendientes.</Text>}
        {activities.size > 0 && (
          <NativeSelect
            label="Actividad"
            value={selectedActivity}
            disabled={loading}
            onChange={(event) => {
              setActivityId(event.currentTarget.value);
              setNotice('');
            }}
            data={[
              { value: '', label: 'Seleccioná una actividad' },
              ...Array.from(activities, ([value, label]) => ({ value, label })),
            ]}
          />
        )}
        {selectedActivity && !loading && !error &&
          <RestockTripList trips={trips} remainingBikes={plan?.remainingBikes ?? 0} onSelect={setTrip} />}
      </Stack>
      {trip && <ConfirmRestockTrip
        {...trip}
        formatError={formatError}
        onClose={() => setTrip(null)}
        onConfirmed={onConfirmed}
      />}
    </Paper>
  );
}

function RestockTripList({ trips, remainingBikes, onSelect }: Readonly<{
  trips: Trip[];
  remainingBikes: number;
  onSelect: (trip: Trip) => void;
}>) {
  return (
    <>
      {remainingBikes > 0 && (
        <Text size="sm" c="dimmed">{remainingBikes} bicis sin cubrir en el plan.</Text>
      )}
      {trips.length === 0 && <Text size="sm" c="dimmed">No hay traslados sugeridos para esta actividad.</Text>}
      {trips.map(({ move, task }) => (
        <Paper withBorder p="sm" radius="md" key={`${move.source.stationId}-${task.id}`}>
          <Group justify="space-between">
            <div>
              <Text fw={600} size="sm">{move.source.stationName} → {move.destinationName}</Text>
              <Text size="xs" c="dimmed">
                {move.distanceMeters} m entre estaciones
                {move.sharedDestination && ' · Destino compartido entre actividades'}
              </Text>
            </div>
            <Group gap="sm">
              <Badge variant="light">{move.bikes} {move.bikes === 1 ? 'bici prevista' : 'bicis previstas'}</Badge>
              <Button size="xs" variant="light" onClick={() => onSelect({ move, task })}>
                Completar traslado
              </Button>
            </Group>
          </Group>
        </Paper>
      ))}
    </>
  );
}

function ConfirmRestockTrip({ move, task, formatError, onClose, onConfirmed }: Readonly<Trip & {
  formatError: Props['formatError'];
  onClose: () => void;
  onConfirmed: (count: number) => void;
}>) {
  const [available, setAvailable] = useState<BikeResponse[] | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void bikeService.getAvailable(move.source.stationId, controller.signal).then((bikes) => {
      if (!controller.signal.aborted) setAvailable(bikes);
    }).catch((requestError: unknown) => {
      if (controller.signal.aborted) return;
      setAvailable([]);
      setError(formatError(requestError));
    });
    return () => controller.abort();
  }, [move.source.stationId, formatError]);

  const confirm = async () => {
    setSubmitting(true);
    setError('');
    try {
      const moved = await bikeService.transferForRestock({
        sourceStationId: move.source.stationId,
        destinationStationId: move.destinationId,
        restockTaskId: task.id,
        bikeIds: selected,
      });
      onConfirmed(moved.length);
    } catch (requestError) {
      setError(formatError(requestError));
      setSubmitting(false);
    }
  };

  return (
    <Modal opened centered zIndex={CONFIRMATION_MODAL_Z_INDEX} title="Confirmar traslado" onClose={onClose}
      closeOnEscape={!submitting} closeOnClickOutside={!submitting} withCloseButton={!submitting}>
      <Stack gap="sm">
        <Text fw={600}>{move.source.stationName} → {move.destinationName}</Text>
        <Text size="sm">El plan propone {move.bikes} {move.bikes === 1 ? 'bici' : 'bicis'}. Marcá los códigos de las bicis que efectivamente trasladaron.</Text>
        {error && <Alert color="red">{error}</Alert>}
        {available === null && <Text size="sm" c="dimmed">Cargando bicis disponibles del origen…</Text>}
        {available?.length === 0 && !error &&
          <Text size="sm" c="dimmed">La estación de origen ya no tiene bicis disponibles.</Text>}
        {available && available.length > 0 && (
          <ScrollArea.Autosize mah={240}>
            <Stack gap="xs" p={4}>
              {available.map((bike) => {
                const checked = selected.includes(bike.id);
                return <Checkbox key={bike.id} label={bike.code} checked={checked}
                  disabled={submitting || (!checked && selected.length >= move.bikes)}
                  onChange={(event) => {
                    const enabled = event.currentTarget.checked;
                    setSelected((ids) => enabled ? [...ids, bike.id] : ids.filter((id) => id !== bike.id));
                  }} />;
              })}
            </Stack>
          </ScrollArea.Autosize>
        )}
        <Group justify="space-between">
          <Text size="sm" c="dimmed" role="status">{selected.length} de {move.bikes} seleccionadas</Text>
          <Group gap="xs">
            <Button variant="default" disabled={submitting} onClick={onClose}>Cancelar</Button>
            <Button disabled={selected.length === 0} loading={submitting} onClick={() => void confirm()}>
              Registrar traslado
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );
}
