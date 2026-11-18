import { Alert, Badge, Button, Group, Loader, NumberInput, Paper, Progress, Stack, Tabs, Text, TextInput, ThemeIcon, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { ArrowRight, Bike, ChevronRight, History, Pencil, RefreshCw, Search } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';

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
type RestockView = RestockStatus | 'HISTORY';
const labels: Record<RestockStatus, string> = { PENDING: 'Por realizar', COMPLETED: 'Realizadas', EXPIRED: 'No realizadas' };
const resolutions = {
  STOCK_SUFFICIENT: 'Stock suficiente', TARGET_REACHED: 'Reabastecida',
  MANUAL: 'Confirmada manualmente', EXPIRED: 'Plazo vencido', OUTSIDE_COVERAGE: 'Fuera de la nueva cobertura',
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
  const [status, setStatus] = useState<RestockView>('PENDING');
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
  const grouped = groupActivities(tasks);
  const history = [...grouped.values()].filter((rows) => activityOutcome(rows) !== 'PENDING');
  const activeTasks = tasks.filter((task) => task.activityChange?.state !== 'CANCELADA');
  const events = visibleActivities(grouped, status, query);
  const totals = new Map<string, { total: number; done: number }>();
  for (const task of tasks) {
    if (task.outsideCoverage) continue;
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
              <Tabs value={status} onChange={(value) => { if (value) setStatus(value as RestockView); }}>
                <Tabs.List>
                  {(Object.keys(labels) as RestockStatus[]).map((key) =>
                    <Tabs.Tab value={key} key={key}>{labels[key]} ({activeTasks.filter((task) => task.status === key).length})</Tabs.Tab>)}
                  <Tabs.Tab value="HISTORY">Historial ({history.length})</Tabs.Tab>
                </Tabs.List>
              </Tabs>
              {events.size === 0 && <Text c="dimmed">No hay tareas para mostrar en esta sección.</Text>}
            </>
          ))}
        </Stack>
      </Paper>
      {[...events].map(([id, rows]) => {
        const event = rows[0];
        const count = totals.get(id);
        const change = event.activityChange;
        const paused = change != null && change.state !== 'PROGRAMADA';
        const historical = status === 'HISTORY';
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
                {historical && <Badge variant="light" color={activityOutcome(rows) === 'CANCELLED' ? 'red' : 'gray'}>
                  {activityOutcomeLabels[activityOutcome(rows)]}
                </Badge>}
                {count && <Badge variant="light">{count.done} de {count.total} estaciones realizadas</Badge>}
                {canPlan && <Button variant="light" size="sm" leftSection={<Bike size={16} />}
                  aria-expanded={openPlan === id} aria-controls={openPlan === id ? `transfer-plan-${event.id}` : undefined}
                  onClick={() => setOpenPlan(openPlan === id ? null : id)}>
                  {openPlan === id ? 'Ocultar plan' : 'Ver plan de traslados'}
                </Button>}
              </Group>
            </Group>
            <ActivityChanges key={status} event={event} initiallyOpen={status === 'PENDING'} />
            {canPlan && openPlan === id &&
              <TransferPlan activityId={id} sectionId={`transfer-plan-${event.id}`} refresh={refresh} />}
            <ActivityStations rows={rows} historical={historical} paused={paused} onUpdated={replace} />
          </Paper>
        );
      })}
    </Stack>
  );
}

type ActivityOutcome = 'PENDING' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';
const activityOutcomeLabels: Record<ActivityOutcome, string> = {
  PENDING: 'Por realizar', COMPLETED: 'Realizada', EXPIRED: 'No realizada', CANCELLED: 'Cancelada',
};

function groupActivities(tasks: RestockTask[]) {
  const grouped = new Map<string, RestockTask[]>();
  for (const task of tasks) {
    const rows = grouped.get(task.activityId);
    if (rows) rows.push(task);
    else grouped.set(task.activityId, [task]);
  }
  return grouped;
}

function activityOutcome(rows: RestockTask[]): ActivityOutcome {
  if (rows.some((task) => task.activityChange?.state === 'CANCELADA')) return 'CANCELLED';
  const covered = rows.filter((task) => !task.outsideCoverage);
  if (covered.some((task) => task.status === 'PENDING')) return 'PENDING';
  if (covered.length === 0 || covered.some((task) => task.status === 'EXPIRED')) return 'EXPIRED';
  return 'COMPLETED';
}

function visibleActivities(grouped: Map<string, RestockTask[]>, view: RestockView, query: string) {
  const search = normalize(query);
  const visible = new Map<string, RestockTask[]>();
  for (const [id, rows] of grouped) {
    if (!rows.some((task) => normalize(task.activityTitle).includes(search) ||
      normalize(task.stationName).includes(search))) continue;
    if (view === 'HISTORY') {
      if (activityOutcome(rows) !== 'PENDING') visible.set(id, rows);
      continue;
    }
    if (activityOutcome(rows) === 'CANCELLED') continue;
    const matching = rows.filter((task) => task.status === view);
    if (matching.length > 0) visible.set(id, matching);
  }
  return visible;
}

function ActivityStations({ rows, historical, paused, onUpdated }: Readonly<{
  rows: RestockTask[]; historical: boolean; paused: boolean; onUpdated: (task: RestockTask) => void;
}>) {
  const stations = (
    <ul className={classes.restockStations} aria-label={`Estaciones de ${rows[0].activityTitle}`}>
      {rows.map((task) => <StationCard key={task.id} task={task} paused={paused || historical} onUpdated={onUpdated} />)}
    </ul>
  );
  if (!historical) return stations;
  return (
    <details>
      <summary>Ver estaciones de la actividad ({rows.length})</summary>
      <div style={{ marginTop: '0.75rem' }}>{stations}</div>
    </details>
  );
}

function ActivityChanges({ event, initiallyOpen }: Readonly<{ event: RestockTask; initiallyOpen: boolean }>) {
  const { activityChange, previousDeadline, deadlineChangedAt, locationChangedAt } = event;
  const notice = activityChange && activityStates[activityChange.state];
  const count = Number(!!activityChange) + Number(!!previousDeadline) + Number(!!locationChangedAt);
  if (!count) return null;

  return (
    <details className={classes.activityChanges} open={initiallyOpen}>
      <summary className={classes.activityChangesSummary}>
        <ChevronRight className={classes.activityChangesChevron} size={16} aria-hidden="true" />
        <History size={16} aria-hidden="true" />
        <span>Cambios del evento</span>
        <span className={classes.activityChangeCount}>{count}</span>
      </summary>
      <ul>
        {activityChange && notice && (
          <ActivityChangeRow title={<Badge variant="light" color={notice.color}>{notice.label}</Badge>}
            timestamp={activityChange.modifiedAt} timestampLabel="Informado por Espacios">
            {activityChange.state !== 'PROGRAMADA' && <Text size="sm">El plan de traslados está pausado para este evento.</Text>}
            {activityChange.reason && <Text size="sm">Motivo: {activityChange.reason}</Text>}
          </ActivityChangeRow>
        )}
        {previousDeadline && (
          <ActivityChangeRow title="Horario de cierre modificado" timestamp={deadlineChangedAt}>
            <dl className={classes.activityDeadlineDetails}>
              <div><dt>Cierre anterior</dt><dd>{deadlineFormat.format(new Date(previousDeadline))}</dd></div>
              <div><dt>Cierre nuevo</dt><dd>{deadlineFormat.format(new Date(event.deadline))}</dd></div>
            </dl>
          </ActivityChangeRow>
        )}
        {locationChangedAt && (
          <ActivityChangeRow title="Ubicación modificada" timestamp={locationChangedAt}>
            <Text size="sm">Se recalcularon las estaciones del evento.</Text>
          </ActivityChangeRow>
        )}
      </ul>
    </details>
  );
}

function ActivityChangeRow({ title, timestamp, timestampLabel = 'Cambio registrado', children }: Readonly<{
  title: ReactNode; timestamp?: string | null; timestampLabel?: string; children?: ReactNode;
}>) {
  return (
    <li className={classes.activityChangeRow}>
      <div className={classes.activityChangeHeading}>
        <Text component="div" size="sm" fw={700}>{title}</Text>
        {timestamp && (
          <Text size="xs" c="dimmed">
            {timestampLabel} · <time dateTime={timestamp}>{deadlineFormat.format(new Date(timestamp))}</time>
          </Text>
        )}
      </div>
      {children}
    </li>
  );
}

const stationStatusColors: Record<RestockStatus, string> = {
  PENDING: 'orange',
  COMPLETED: 'teal',
  EXPIRED: 'gray',
};

function stationStatusLabel(task: RestockTask, paused: boolean) {
  if (task.resolution) return resolutions[task.resolution];
  if (paused) return 'Tarea en pausa';

  const missing = task.targetBikes - task.availableBikes;
  if (missing <= 0) return 'Objetivo alcanzado';
  return missing === 1 ? 'Falta 1 bici' : `Faltan ${missing} bicis`;
}

function stationProgressColor(status: RestockStatus, progress: number) {
  if (status === 'EXPIRED') return 'gray';
  return progress === 100 ? 'teal' : 'blue';
}

function StationCard({ task, paused, onUpdated }: Readonly<{
  task: RestockTask; paused: boolean; onUpdated: (task: RestockTask) => void;
}>) {
  const [target, setTarget] = useState<number | string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = task.status === 'PENDING';
  const withoutAvailability = task.totalBikes == null ? 0 : Math.max(0, task.totalBikes - task.availableBikes);
  const progress = Math.min(100, 100 * task.availableBikes / task.targetBikes);
  const noSpaceForBikes = task.availableSlots === 0 && pending;
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
            <Text size="xs" c="dimmed">{task.outsideCoverage ? 'Fuera de la cobertura actual' : `${task.distanceMeters} m del evento`}</Text>
          </div>
          <Badge variant="light" color={stationStatusColors[task.status]} className={classes.restockStationStatus}>
            {stationStatusLabel(task, paused)}
          </Badge>
        </Group>

        <Stack gap={5}>
          <Group justify="space-between" gap="xs" align="baseline">
            <Text size="sm"><Text component="span" fw={700}>{task.availableBikes}</Text> disponibles</Text>
            <Text size="xs" c="dimmed">Objetivo: {task.targetBikes}</Text>
          </Group>
          <Progress value={progress} color={stationProgressColor(task.status, progress)} size="sm"
            aria-label={`${task.availableBikes} bicis disponibles de un objetivo de ${task.targetBikes}`} />
          <Text size="xs" c="dimmed">
            {task.totalBikes == null ? `${task.capacity} anclajes` : `${task.totalBikes} en estación · ${task.capacity} anclajes`}
            {withoutAvailability > 0 && ` · ${withoutAvailability} sin disponibilidad`}
          </Text>
          <Text size="xs" c={noSpaceForBikes ? 'red.8' : 'dimmed'}
            fw={noSpaceForBikes ? 600 : 400}>
            {task.availableSlots === 1 ? '1 anclaje libre' : `${task.availableSlots} anclajes libres`}
            {noSpaceForBikes && ' · Sin lugar para recibir bicis'}
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

function TransferPlan({ activityId, sectionId, refresh }: Readonly<{ activityId: string; sectionId: string; refresh: number }>) {
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
