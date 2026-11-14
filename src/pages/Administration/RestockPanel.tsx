import { Alert, Badge, Button, Group, Loader, NumberInput, Paper, Progress, Stack, Tabs, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { ArrowRight, Bike, Pencil, RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { restockService, type EventTransferPlan, type RestockStatus, type RestockTask } from '../../services/restock/restockService';
import classes from './Administration.module.css';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; tasks: RestockTask[] }
  | { kind: 'error'; message: string };

const deadlineFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Argentina/Buenos_Aires',
});
const labels: Record<RestockStatus, string> = { PENDING: 'Por realizar', COMPLETED: 'Realizadas', EXPIRED: 'Vencidas' };
const resolutions = {
  STOCK_SUFFICIENT: 'Stock suficiente', TARGET_REACHED: 'Reabastecida',
  MANUAL: 'Confirmada manualmente', EXPIRED: 'Objetivo no alcanzado',
};

const activityStates = {
  PROGRAMADA: { label: 'Evento reanudado', color: 'blue' },
  SUSPENDIDA: { label: 'Evento suspendido', color: 'orange' },
  CANCELADA: { label: 'Evento cancelado', color: 'red' },
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-AR').trim();
}

function errorMessage(error: unknown) {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (status === 401 || status === 403) return 'Revisá que tu sesión tenga permisos de administración.';
  if (status === 404) return 'El backend configurado todavía no ofrece el listado de reabastecimiento.';
  return 'Verificá la conexión con el backend e intentá nuevamente.';
}

export function RestockPanel() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<RestockStatus>('PENDING');
  const [refresh, setRefresh] = useState(0);
  const [openPlan, setOpenPlan] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const tasks = await restockService.getUpcoming(controller.signal);
        if (!controller.signal.aborted) setState({ kind: 'ready', tasks });
      } catch (error) {
        if (!controller.signal.aborted) setState({ kind: 'error', message: errorMessage(error) });
      } finally {
        loading = false;
      }
    };
    void load();
    const interval = window.setInterval(() => void load(), 5000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [refresh]);

  const reload = () => {
    setState({ kind: 'loading' });
    setRefresh((previous) => previous + 1);
  };
  const replace = (updated: RestockTask) => {
    setState((current) => current.kind === 'ready'
      ? { kind: 'ready', tasks: current.tasks.map((task) => task.id === updated.id ? updated : task) }
      : current);
    setRefresh((previous) => previous + 1);
  };

  const tasks = state.kind === 'ready' ? state.tasks : [];
  const search = normalize(query);
  const events = new Map<string, RestockTask[]>();
  const visible = tasks.filter((task) => task.status === status &&
    (normalize(task.activityTitle).includes(search) || normalize(task.stationName).includes(search)));
  for (const task of visible) {
    const group = events.get(task.activityId);
    if (group) group.push(task);
    else events.set(task.activityId, [task]);
  }
  const totals = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    const count = totals.get(task.activityId) ?? { total: 0, done: 0 };
    count.total += 1;
    if (task.status === 'COMPLETED') count.done += 1;
    totals.set(task.activityId, count);
  }

  return (
    <Stack gap="md">
      <Paper className={classes.tablePanel} radius="md" p="lg">
        <Stack gap="md">
          <Group align="flex-start" justify="space-between">
            <div>
              <Title order={2}>Reabastecimiento de estaciones</Title>
              <Text c="dimmed" size="sm">Consultá el avance de las estaciones por evento y priorizá las que necesitan bicicletas.</Text>
            </div>
            <Button leftSection={<RefreshCw size={16} />} loading={state.kind === 'loading'} onClick={reload} variant="light">
              Actualizar tareas
            </Button>
          </Group>
          {state.kind === 'loading' && <Group role="status"><Loader size="sm" /><Text size="sm">Cargando tareas de reabastecimiento…</Text></Group>}
          {state.kind === 'error' && <RetryErrorAlert title="No se pudieron cargar las tareas" message={state.message} onRetry={reload} />}
          {state.kind === 'ready' && (tasks.length === 0 ? <Text c="dimmed">No hay tareas de reabastecimiento.</Text> : (
            <>
              <TextInput label="Buscar por evento o estación" placeholder="Ingresá un nombre" leftSection={<Search size={16} />}
                value={query} onChange={(event) => setQuery(event.currentTarget.value)} />
              <Tabs value={status} onChange={(value) => { if (value) setStatus(value as RestockStatus); }}>
                <Tabs.List>
                  {(Object.keys(labels) as RestockStatus[]).map((key) =>
                    <Tabs.Tab value={key} key={key}>{labels[key]} ({tasks.filter((task) => task.status === key).length})</Tabs.Tab>)}
                </Tabs.List>
              </Tabs>
              {visible.length === 0 && <Text c="dimmed">No hay tareas para mostrar en esta sección.</Text>}
            </>
          ))}
        </Stack>
      </Paper>
      {[...events].map(([id, rows]) => {
        const event = rows[0];
        const count = totals.get(id);
        const change = event.activityChange;
        const notice = change && activityStates[change.state];
        const paused = change != null && change.state !== 'PROGRAMADA';
        const canPlan = status === 'PENDING' && !paused;
        return (
          <Paper className={classes.tablePanel} radius="md" p="lg" key={id}>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={3}>{event.activityTitle}</Title>
                <Text c="dimmed" size="sm">
                  Hora límite: {deadlineFormat.format(new Date(event.deadline))} · Buenos Aires
                  {event.coverageMeters != null && ` · Radio de cobertura: ${event.coverageMeters} m`}
                </Text>
              </div>
              <Group gap="sm">
                {count && <Badge variant="light">{count.done} de {count.total} estaciones realizadas</Badge>}
                {canPlan && <Button variant="light" size="sm" leftSection={<Bike size={16} />}
                  aria-expanded={openPlan === id} aria-controls={openPlan === id ? `transfer-plan-${event.id}` : undefined}
                  onClick={() => setOpenPlan(openPlan === id ? null : id)}>
                  {openPlan === id ? 'Ocultar plan' : 'Ver plan de traslados'}
                </Button>}
              </Group>
            </Group>
            {change && notice && <Alert mb="md" color={notice.color} title={notice.label}>
              <Text size="sm">Actualizado por Espacios el {deadlineFormat.format(new Date(change.modifiedAt))}.
                {paused && ' El plan de traslados está pausado para este evento.'}
              </Text>
              {change.reason && <Text size="sm" mt={4}>Motivo: {change.reason}</Text>}
            </Alert>}
            {canPlan && openPlan === id &&
              <TransferPlan activityId={id} sectionId={`transfer-plan-${event.id}`} refresh={refresh} />}
            <ul className={classes.restockStations} aria-label={`Estaciones de ${event.activityTitle}`}>
              {rows.map((task) => <StationCard key={task.id} task={task} paused={paused} onUpdated={replace} />)}
            </ul>
          </Paper>
        );
      })}
    </Stack>
  );
}

function StationCard({ task, paused, onUpdated }: { task: RestockTask; paused: boolean; onUpdated: (task: RestockTask) => void }) {
  const [target, setTarget] = useState<number | string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = task.status === 'PENDING';
  const missing = Math.max(0, task.targetBikes - task.availableBikes);
  const withoutAvailability = task.totalBikes == null ? 0 : Math.max(0, task.totalBikes - task.availableBikes);
  const progress = Math.min(100, 100 * task.availableBikes / task.targetBikes);
  const progressColor = task.status === 'EXPIRED' ? 'gray' : progress === 100 ? 'teal' : 'blue';
  const run = async (action: 'target' | 'complete') => {
    setBusy(true);
    setError(false);
    try {
      const updated = action === 'complete' ? await restockService.complete(task.id)
        : await restockService.updateTarget(task.id, Number(target));
      setTarget(null);
      setEditing(false);
      onUpdated(updated);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper component="li" className={classes.restockStation} radius="md" p="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="xs">
          <div>
            <Title order={4} size="sm">{task.stationName}</Title>
            <Text size="xs" c="dimmed">{task.distanceMeters} m del evento</Text>
          </div>
          <Badge variant="light" color={pending ? 'orange' : task.status === 'COMPLETED' ? 'teal' : 'gray'}
            className={classes.restockStationStatus}>
            {task.resolution ? resolutions[task.resolution] : paused ? 'Tarea en pausa' : missing > 0
              ? (missing === 1 ? 'Falta 1 bici' : `Faltan ${missing} bicis`)
              : 'Objetivo alcanzado'}
          </Badge>
        </Group>

        <Stack gap={5}>
          <Group justify="space-between" gap="xs" align="baseline">
            <Text size="sm"><Text component="span" fw={700}>{task.availableBikes}</Text> disponibles</Text>
            <Text size="xs" c="dimmed">Objetivo: {task.targetBikes}</Text>
          </Group>
          <Progress value={progress} color={progressColor} size="sm"
            aria-label={`${task.availableBikes} bicis disponibles de un objetivo de ${task.targetBikes}`} />
          <Text size="xs" c="dimmed">
            {task.totalBikes == null ? `${task.capacity} anclajes` : `${task.totalBikes} en estación · ${task.capacity} anclajes`}
            {withoutAvailability > 0 && ` · ${withoutAvailability} sin disponibilidad`}
          </Text>
          <Text size="xs" c={task.availableSlots === 0 && pending ? 'red.8' : 'dimmed'}
            fw={task.availableSlots === 0 && pending ? 600 : 400}>
            {task.availableSlots === 1 ? '1 anclaje libre' : `${task.availableSlots} anclajes libres`}
            {task.availableSlots === 0 && pending && ' · Sin lugar para recibir bicis'}
          </Text>
          {task.resolvedAt && <Text size="xs" c="dimmed">{deadlineFormat.format(new Date(task.resolvedAt))}</Text>}
        </Stack>

        {pending && !paused && <div className={classes.restockStationActions}>
          {editing ? (
            <Group gap="xs">
              <NumberInput aria-label={`Objetivo para ${task.stationName}`} value={target ?? task.targetBikes}
                onChange={setTarget} min={1} max={task.capacity} allowDecimal={false} w={85} size="xs" disabled={busy} />
              <Button size="xs" variant="light" disabled={busy || typeof target !== 'number' || !Number.isInteger(target) ||
                target < 1 || target > task.capacity || target === task.targetBikes}
                onClick={() => void run('target')}>Guardar objetivo</Button>
              <Button size="xs" variant="subtle" disabled={busy} onClick={() => {
                setTarget(null);
                setEditing(false);
                setError(false);
              }}>Cancelar</Button>
            </Group>
          ) : (
            <Group gap="xs" justify="space-between">
              <Button size="xs" variant="light" leftSection={<Pencil size={13} />} disabled={busy}
                onClick={() => { setError(false); setEditing(true); }}>Editar objetivo</Button>
              <Button size="xs" variant="subtle" disabled={busy} onClick={() => void run('complete')}>Marcar realizada</Button>
            </Group>
          )}
        </div>}
        {error && <Alert color="red">No se pudo realizar la acción. Actualizá las tareas y volvé a intentar.</Alert>}
      </Stack>
    </Paper>
  );
}

function TransferPlan({ activityId, sectionId, refresh }: { activityId: string; sectionId: string; refresh: number }) {
  const [result, setResult] = useState<{ plan?: EventTransferPlan; error?: string }>();
  const [retry, setRetry] = useState(0);
  const [useModel, setUseModel] = useState(false);
  const requestPlan = (model: boolean) => {
    setUseModel(model);
    setResult(undefined);
    setRetry((previous) => previous + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const plans = await restockService.getTransferPlans(controller.signal, useModel);
        if (!controller.signal.aborted) setResult({ plan: plans.find((plan) => plan.activityId === activityId) });
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ error: isAxiosError(error) && error.response?.status === 404
            ? 'Actualizá el backend para consultar el plan de traslados.'
            : errorMessage(error) });
        }
      } finally {
        loading = false;
      }
    };
    void load();
    const interval = useModel ? undefined : window.setInterval(() => void load(), 5000);
    return () => { controller.abort(); window.clearInterval(interval); };
  }, [activityId, refresh, retry, useModel]);

  const plan = result?.plan;
  const modelMessages = {
    MODEL: 'El modelo ordenó los orígenes según distancia y excedente. Revisá el stock antes de ejecutar.',
    NO_CHOICE: 'El plan por distancia se mantiene. No hay destinos con más de un origen viable.',
    MODEL_UNAVAILABLE: 'Se muestra el plan por distancia. El modelo no está disponible.',
    COVERAGE_PROTECTED: 'Se mantiene el plan por distancia para conservar el reparto por destino.',
    DISTANCE: 'El backend devolvió el plan por distancia.',
  };
  const sources = new Map<number, { source: EventTransferPlan['transfers'][number]['source']; moves: EventTransferPlan['transfers'] }>();
  for (const move of plan?.transfers ?? []) {
    const group = sources.get(move.source.stationId);
    if (group) group.moves.push(move);
    else sources.set(move.source.stationId, { source: move.source, moves: [move] });
  }

  return (
    <Paper component="section" id={sectionId} aria-labelledby={`${sectionId}-title`}
      className={classes.transferPlan} radius="md" mb="md" p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm" wrap="nowrap">
            <ThemeIcon variant="light" radius="md" size="lg"><Bike size={18} /></ThemeIcon>
            <div>
              <Title order={4} id={`${sectionId}-title`}>Plan de traslados</Title>
              <Text size="xs" c="dimmed">Sugerencia para coordinar desde Bicicletas</Text>
            </div>
          </Group>
          {plan && <Group gap="xs">
            <Badge variant="light" color="blue">{plan.plannedBikes} a trasladar</Badge>
            {plan.remainingBikes > 0 && <Badge variant="light" color="orange">{plan.remainingBikes} sin cubrir</Badge>}
          </Group>}
        </Group>
        <Group gap="xs">
          <Button size="xs" variant="light" disabled={!result} onClick={() => requestPlan(true)}>
            {useModel ? 'Recalcular con IA' : 'Evaluar orígenes con IA'}
          </Button>
          {useModel && <Button size="xs" variant="subtle" onClick={() => requestPlan(false)}>Ver plan por distancia</Button>}
        </Group>
        {useModel && plan && <Text size="xs" c="dimmed" role="status">{modelMessages[plan.strategy ?? 'DISTANCE']}</Text>}
        {!result && <Group role="status"><Loader size="xs" /><Text size="sm">Calculando traslados…</Text></Group>}
        {result?.error && <RetryErrorAlert title="No se pudo consultar el plan" message={result.error}
          onRetry={() => requestPlan(useModel)} />}
        {result && !result.error && sources.size === 0 && <Text size="sm" c="dimmed">
          {plan?.remainingBikes ? 'No hay excedente asignable a las estaciones pendientes de este evento.' : 'No hay traslados pendientes para este evento.'}
        </Text>}
        {Array.from(sources.values(), ({ source, moves }) => (
          <Paper key={source.stationId} className={classes.transferSource} radius="md" p="sm">
            <Group justify="space-between" align="flex-start" gap="xs">
              <div>
                <Text fw={700} size="sm">{source.stationName}</Text>
                <Text size="xs" c="dimmed">{source.totalBikes} en estación · {source.availableBikes} disponibles · mínimo {source.minimumBikes}</Text>
              </div>
              <Badge variant="light" color="teal">Puede ceder {source.transferableBikes}</Badge>
            </Group>
            <Stack gap={0} mt="xs">
              {moves.map((move) => (
                <Group className={classes.transferRoute} key={move.destinationId} justify="space-between" gap="xs">
                  <Group gap="xs" wrap="nowrap">
                    <ArrowRight size={15} aria-hidden="true" />
                    <div>
                      <Text size="sm" fw={600}>{move.destinationName}</Text>
                      <Text size="xs" c="dimmed">{move.distanceMeters} m entre estaciones{move.sharedDestination && ' · Traslado compartido entre eventos'}</Text>
                    </div>
                  </Group>
                  <Text size="sm" fw={700}>{move.bikes} {move.bikes === 1 ? 'bici' : 'bicis'}</Text>
                </Group>
              ))}
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
