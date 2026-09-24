import { Alert, Badge, Button, Group, Loader, NativeSelect, Paper, ScrollArea, SimpleGrid, Stack, Tabs, Table, Text, Textarea, TextInput, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { AlertCircle, Bike, CheckCircle2, ParkingCircle, RefreshCw, Search, Wrench } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { useAuth } from '../../app/providers/authContext';
import mobilityNavigationClasses from '../../components/mobility/MobilityNavigation/MobilityNavigation.module.css';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { bikeService } from '../../services/bikes/bikeService';
import { incidentService } from '../../services/incidents/incidentService';
import { maintenanceService } from '../../services/maintenance/maintenanceService';
import { stationService } from '../../services/stations/stationService';
import { BikeManagement } from './BikeManagement';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { StationManagement } from './StationManagement';
import type { AdminIncidentResponse, IncidentStatus } from '../../types/incident';
import type { MaintenanceResponse } from '../../types/maintenance';
import type { BikeResponse, BikeStatus } from '../../types/bike';
import type { Station } from '../../types/station';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './Administration.module.css';

const maxTextLength = 2000;

const incidentStatusLabels: Record<IncidentStatus, string> = {
  OPEN: 'Abierta',
  UNDER_REVIEW: 'En revisión',
  RESOLVED: 'Resuelta',
  REJECTED: 'Rechazada',
};

const maintenanceStatusLabels = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
} as const;

export function AdministrationPage() {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  const [incidents, setIncidents] = useState<AdminIncidentResponse[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceResponse[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [bikes, setBikes] = useState<BikeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const bikeCountByStation = useMemo(() => {
    const counts = new Map<number, number>();
    bikes.forEach((bike) => {
      if (bike.stationId !== null) counts.set(bike.stationId, (counts.get(bike.stationId) ?? 0) + 1);
    });
    return counts;
  }, [bikes]);

  const loadAdministrationData = useCallback(async () => {
    if (userId === null) {
      setLoadError('No hay un usuario configurado para realizar operaciones administrativas.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedIncidents, loadedMaintenance, loadedStations, loadedBikes] = await Promise.all([
        incidentService.getAll(userId),
        maintenanceService.getAll(userId),
        stationService.getAll(),
        bikeService.getAll(),
      ]);
      setIncidents(loadedIncidents);
      setMaintenance(loadedMaintenance);
      setStations(loadedStations);
      setBikes(loadedBikes);
    } catch (error) {
      setLoadError(administrationErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(loadAdministrationData);
  }, [loadAdministrationData]);

  const updateIncident = async (incidentId: number, status: IncidentStatus) => {
    if (userId === null) return;
    const actionId = `incident-${incidentId}`;
    setPendingAction(actionId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await incidentService.updateStatus(userId, incidentId, { status });
      setIncidents((current) => current.map((incident) => incident.id === updated.id ? updated : incident));
      setActionSuccess('El estado de la incidencia fue actualizado.');
    } catch (error) {
      setActionError(administrationErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const createMaintenance = async (incident: AdminIncidentResponse, description: string) => {
    if (userId === null) return;
    setPendingAction('create-maintenance');
    setActionError(null);
    setActionSuccess(null);
    try {
      const created = await maintenanceService.create(userId, {
        bikeId: incident.bikeId,
        incidentId: incident.id,
        description,
      });
      setMaintenance((current) => [created, ...current]);
      setActionSuccess('La bicicleta fue enviada a mantenimiento.');
    } catch (error) {
      setActionError(administrationErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  const completeMaintenance = async (maintenanceId: number, resolution: string) => {
    if (userId === null) return;
    const actionId = `maintenance-${maintenanceId}`;
    setPendingAction(actionId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const updated = await maintenanceService.complete(userId, maintenanceId, { resolution });
      setMaintenance((current) => current.map((item) => item.id === updated.id ? updated : item));
      setActionSuccess('El mantenimiento fue finalizado.');
    } catch (error) {
      setActionError(administrationErrorMessage(error));
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Administración de Movilidad"
        subtitle="Gestioná la operación del servicio desde un espacio separado de la experiencia ciudadana."
        action={<Button leftSection={<RefreshCw size={16} />} loading={isLoading} onClick={() => void loadAdministrationData()} variant="light">Actualizar datos</Button>}
      />

      {isLoading ? <LoadingState /> : null}
      {loadError ? <LoadError message={loadError} onRetry={() => void loadAdministrationData()} /> : null}
      {!isLoading && !loadError ? (
        <>
          {actionError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo completar la operación">{actionError}</Alert> : null}
          {actionSuccess ? <Alert color="green" icon={<CheckCircle2 size={18} />} title="Operación realizada">{actionSuccess}</Alert> : null}
          <Tabs classNames={{ list: mobilityNavigationClasses.tabsList }} defaultValue="summary" keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="summary">Resumen</Tabs.Tab>
              <Tabs.Tab value="analytics">Analítica</Tabs.Tab>
              <Tabs.Tab value="incidents">Incidencias</Tabs.Tab>
              <Tabs.Tab value="maintenance">Mantenimiento</Tabs.Tab>
              <Tabs.Tab value="stations">Estaciones</Tabs.Tab>
              <Tabs.Tab value="bikes">Bicicletas</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel pt="md" value="summary">
              <AdministrationSummary bikes={bikes} incidents={incidents} maintenance={maintenance} stations={stations} />
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="analytics">
              <AnalyticsDashboard />
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="incidents">
              <Stack gap="lg">
                <AdminBarChart description="Comparación de incidencias según su estado actual." data={incidentChartData(incidents)} title="Incidencias por estado" tone="red" />
                <IncidentsPanel incidents={incidents} onUpdate={updateIncident} pendingAction={pendingAction} />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="maintenance">
              <Stack gap="lg">
                <AdminBarChart description="Distribución de las tareas de mantenimiento registradas." data={maintenanceChartData(maintenance)} title="Mantenimientos por estado" tone="amber" />
                <MaintenancePanel
                  incidents={incidents}
                  maintenance={maintenance}
                  onComplete={completeMaintenance}
                  onCreate={createMaintenance}
                  pendingAction={pendingAction}
                />
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="stations"><StationManagement bikeCountByStation={bikeCountByStation} /></Tabs.Panel>
            <Tabs.Panel pt="md" value="bikes"><Stack gap="lg"><BikeStatusChart bikes={bikes} /><BikeManagement /></Stack></Tabs.Panel>
          </Tabs>
        </>
      ) : null}
    </Stack>
  );
}

function AdministrationSummary({ bikes, incidents, maintenance, stations }: Readonly<{ bikes: BikeResponse[]; incidents: AdminIncidentResponse[]; maintenance: MaintenanceResponse[]; stations: Station[] }>) {
  const openIncidents = incidents.filter((incident) => incident.status === 'OPEN' || incident.status === 'UNDER_REVIEW').length;
  const activeMaintenance = maintenance.filter((item) => item.status === 'PENDING' || item.status === 'IN_PROGRESS').length;
  const activeStations = stations.filter((station) => station.status === 'ACTIVE').length;
  const availableBikes = bikes.filter((bike) => bike.status === 'AVAILABLE').length;

  return (
    <Stack gap="lg">
      <SimpleGrid cols={{ base: 1, xs: 2, lg: 4 }} spacing="md">
        <AdminMetric icon={AlertCircle} label="Incidencias abiertas" tone="red" value={openIncidents} />
        <AdminMetric icon={Wrench} label="Mantenimientos activos" tone="amber" value={activeMaintenance} />
        <AdminMetric icon={ParkingCircle} label="Estaciones activas" tone="green" value={activeStations} />
        <AdminMetric icon={Bike} label="Bicicletas disponibles" tone="blue" value={availableBikes} />
      </SimpleGrid>
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <AdminBarChart description="Vista rápida de los casos que requieren seguimiento." data={incidentChartData(incidents)} title="Estado de incidencias" tone="red" />
        <BikeStatusChart bikes={bikes} compact />
      </SimpleGrid>
      <StationCapacityChart bikes={bikes} stations={stations} />
    </Stack>
  );
}

type ChartTone = 'blue' | 'green' | 'amber' | 'red';
type ChartDatum = { label: string; value: number };

function AdminMetric({ icon: Icon, label, tone, value }: Readonly<{ icon: typeof AlertCircle; label: string; tone: ChartTone; value: number }>) {
  const metricToneClass = toneClass(tone);
  return <Paper className={`${classes.metricCard} ${metricToneClass}`} radius="md" p="md"><div className={classes.metricIcon}><Icon size={21} /></div><Text className={classes.metricLabel}>{label}</Text><Text className={classes.metricNumber}>{value}</Text></Paper>;
}

function AdminBarChart({ data, description, title, tone }: Readonly<{ data: ChartDatum[]; description: string; title: string; tone: ChartTone }>) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const chartToneClass = toneClass(tone);
  return (
    <Paper aria-label={title} className={`${classes.chartCard} ${chartToneClass}`} radius="md" p="lg" role="img">
      <Title className={classes.chartTitle} order={2}>{title}</Title>
      <Text c="dimmed" size="sm">{description}</Text>
      <Stack className={classes.barChart} gap="sm" mt="lg">
        {data.map((item) => <div className={classes.barRow} key={item.label}><Text className={classes.barLabel}>{item.label}</Text><div className={classes.barTrack}><div className={classes.barFill} style={{ width: `${item.value === 0 ? 0 : Math.max(8, item.value / max * 100)}%` }} /></div><Text className={classes.barValue}>{item.value}</Text></div>)}
      </Stack>
    </Paper>
  );
}

function BikeStatusChart({ bikes, compact = false }: Readonly<{ bikes: BikeResponse[]; compact?: boolean }>) {
  const data: Array<ChartDatum & { color: string }> = [
    { label: 'Disponibles', value: countBikes(bikes, 'AVAILABLE'), color: 'var(--citypass-urban-green)' },
    { label: 'En uso', value: countBikes(bikes, 'IN_USE'), color: 'var(--citypass-urban-blue)' },
    { label: 'Mantenimiento', value: countBikes(bikes, 'MAINTENANCE'), color: 'var(--citypass-amber)' },
    { label: 'Fuera de servicio', value: countBikes(bikes, 'OUT_OF_SERVICE') + countBikes(bikes, 'STOLEN'), color: 'var(--citypass-emergency-red)' },
  ];
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = data.map((item) => { const start = cursor; cursor += total === 0 ? 0 : item.value / total * 100; return `${item.color} ${start}% ${cursor}%`; });
  const background = total === 0 ? 'var(--citypass-concrete)' : `conic-gradient(${segments.join(', ')})`;

  return <Paper aria-label="Distribución de bicicletas por estado" className={`${classes.chartCard} ${classes.toneBlue}`} radius="md" p="lg" role="img"><Title className={classes.chartTitle} order={2}>Bicicletas por estado</Title><Text c="dimmed" size="sm">Composición de las bicicletas cargadas en estaciones.</Text><div className={`${classes.donutLayout} ${compact ? classes.donutCompact : ''}`}><div className={classes.donut} style={{ background }}><div><Text className={classes.donutTotal}>{total}</Text><Text c="dimmed" size="xs">Total</Text></div></div><Stack gap="xs">{data.map((item) => <Group gap="xs" justify="space-between" key={item.label} wrap="nowrap"><Group gap="xs" wrap="nowrap"><span className={classes.legendDot} style={{ background: item.color }} /><Text size="sm">{item.label}</Text></Group><Text fw={800} size="sm">{item.value}</Text></Group>)}</Stack></div></Paper>;
}

function StationCapacityChart({ bikes, stations }: Readonly<{ bikes: BikeResponse[]; stations: Station[] }>) {
  const [query, setQuery] = useState('');
  const visibleStations = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return stations;
    return stations.filter((station) => normalizeSearch(`${station.name} ${station.address}`).includes(normalizedQuery));
  }, [query, stations]);

  return (
    <Paper aria-label="Ocupación de estaciones" className={`${classes.chartCard} ${classes.toneGreen}`} radius="md" p="lg" role="img">
      <Group align="flex-end" justify="space-between" wrap="wrap">
        <div>
          <Title className={classes.chartTitle} order={2}>Ocupación de estaciones</Title>
          <Text c="dimmed" size="sm">Consultá todas las estaciones y compará las bicicletas registradas con su capacidad.</Text>
        </div>
        <TextInput
          aria-label="Buscar estación en ocupación"
          className={classes.stationSearch}
          leftSection={<Search size={16} />}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Buscar estación"
          value={query}
        />
      </Group>
      <Text className={classes.stationCount} mt="md" size="xs">{visibleStations.length} de {stations.length} estaciones</Text>
      {stations.length === 0 ? <Text c="dimmed" mt="lg">No hay estaciones para representar.</Text> : null}
      {stations.length > 0 && visibleStations.length === 0 ? <Text c="dimmed" mt="lg">No encontramos estaciones con esa búsqueda.</Text> : null}
      {visibleStations.length > 0 ? (
        <ScrollArea.Autosize mah={430} mt="md" offsetScrollbars type="auto">
          <Stack className={classes.stationCapacityList} gap="md">
            {visibleStations.map((station) => {
              const count = bikes.filter((bike) => bike.stationId === station.id).length;
              const percentage = station.capacity === 0 ? 0 : Math.min(100, count / station.capacity * 100);
              return <div key={station.id}><Group justify="space-between" gap="sm"><Text className={classes.stationLabel}>{station.name}</Text><Text c="dimmed" size="xs">{count} / {station.capacity}</Text></Group><div className={classes.capacityTrack}><div className={classes.capacityFill} style={{ width: `${percentage}%` }} /></div></div>;
            })}
          </Stack>
        </ScrollArea.Autosize>
      ) : null}
    </Paper>
  );
}

function incidentChartData(incidents: AdminIncidentResponse[]): ChartDatum[] {
  return (Object.keys(incidentStatusLabels) as IncidentStatus[]).map((status) => ({ label: incidentStatusLabels[status], value: incidents.filter((incident) => incident.status === status).length }));
}

function maintenanceChartData(maintenance: MaintenanceResponse[]): ChartDatum[] {
  return (Object.keys(maintenanceStatusLabels) as Array<keyof typeof maintenanceStatusLabels>).map((status) => ({ label: maintenanceStatusLabels[status], value: maintenance.filter((item) => item.status === status).length }));
}

function countBikes(bikes: BikeResponse[], status: BikeStatus) { return bikes.filter((bike) => bike.status === status).length; }
function capitalize(value: string) { return `${value.charAt(0).toUpperCase()}${value.slice(1)}`; }
function toneClass(tone: ChartTone) { return classes[`tone${capitalize(tone)}`]; }
function normalizeSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-AR'); }

function LoadingState() {
  return <Paper className={classes.statePanel} radius="md" p="xl"><Stack align="center"><Loader color="citypassUrbanBlue" /><Text c="dimmed">Cargando información administrativa...</Text></Stack></Paper>;
}

function LoadError({ message, onRetry }: Readonly<{ message: string; onRetry: () => void }>) {
  return <RetryErrorAlert message={message} onRetry={onRetry} title="No se pudo cargar la administración" />;
}

function IncidentsPanel({ incidents, onUpdate, pendingAction }: Readonly<{ incidents: AdminIncidentResponse[]; onUpdate: (id: number, status: IncidentStatus) => Promise<void>; pendingAction: string | null }>) {
  if (incidents.length === 0) return <EmptyState message="No hay incidencias registradas." />;

  return <Paper className={classes.tablePanel} radius="md" p="md"><ScrollArea><Table miw={900} verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Bicicleta</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Descripción</Table.Th><Table.Th>Usuario</Table.Th><Table.Th>Fecha</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{incidents.map((incident) => <IncidentRow incident={incident} key={incident.id} onUpdate={onUpdate} pending={pendingAction === `incident-${incident.id}`} />)}</Table.Tbody></Table></ScrollArea></Paper>;
}

function IncidentRow({ incident, onUpdate, pending }: Readonly<{ incident: AdminIncidentResponse; onUpdate: (id: number, status: IncidentStatus) => Promise<void>; pending: boolean }>) {
  const transitions = nextIncidentStatuses(incident.status);
  return <Table.Tr><Table.Td>{incident.id}</Table.Td><Table.Td>{incident.bikeCode}</Table.Td><Table.Td>{incident.incidentTypeName}</Table.Td><Table.Td>{incident.description}</Table.Td><Table.Td>{incident.reportedByUserEmail}</Table.Td><Table.Td>{formatDateTime(incident.reportedAt)}</Table.Td><Table.Td><StatusBadge status={incident.status} /></Table.Td><Table.Td><Group gap="xs" wrap="nowrap">{transitions.map((status) => <Button disabled={pending} key={status} loading={pending} onClick={() => void onUpdate(incident.id, status)} size="compact-sm" variant="light">{incidentStatusLabels[status]}</Button>)}</Group></Table.Td></Table.Tr>;
}

function MaintenancePanel({ incidents, maintenance, onComplete, onCreate, pendingAction }: Readonly<{ incidents: AdminIncidentResponse[]; maintenance: MaintenanceResponse[]; onComplete: (id: number, resolution: string) => Promise<void>; onCreate: (incident: AdminIncidentResponse, description: string) => Promise<void>; pendingAction: string | null }>) {
  return <Stack gap="lg"><CreateMaintenanceForm incidents={incidents} isSubmitting={pendingAction === 'create-maintenance'} onCreate={onCreate} />{maintenance.length === 0 ? <EmptyState message="No hay mantenimientos registrados." /> : <Paper className={classes.tablePanel} radius="md" p="md"><ScrollArea><Table miw={800} verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Bicicleta</Table.Th><Table.Th>Incidencia</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Inicio</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Finalizar</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{maintenance.map((item) => <MaintenanceRow item={item} key={item.id} onComplete={onComplete} pending={pendingAction === `maintenance-${item.id}`} />)}</Table.Tbody></Table></ScrollArea></Paper>}</Stack>;
}

function CreateMaintenanceForm({ incidents, isSubmitting, onCreate }: Readonly<{ incidents: AdminIncidentResponse[]; isSubmitting: boolean; onCreate: (incident: AdminIncidentResponse, description: string) => Promise<void> }>) {
  const [incidentId, setIncidentId] = useState('');
  const [description, setDescription] = useState('');
  const incident = useMemo(() => incidents.find((item) => item.id === Number(incidentId)), [incidentId, incidents]);
  const valid = incident !== undefined && description.trim().length > 0;
  return <Paper className={classes.formPanel} radius="md" p="lg"><Stack gap="md"><div><Title className={classes.sectionTitle} order={2}>Enviar bicicleta a mantenimiento</Title><Text c="dimmed" size="sm">Seleccioná una incidencia para asociar la bicicleta real reportada.</Text></div><NativeSelect aria-label="Incidencia para mantenimiento" data={[{ label: 'Seleccioná una incidencia', value: '' }, ...incidents.map((item) => ({ label: `#${item.id} · ${item.bikeCode} · ${item.incidentTypeName}`, value: String(item.id) }))]} label="Incidencia" onChange={(event) => setIncidentId(event.currentTarget.value)} value={incidentId} />{incident ? <Text size="sm">Bicicleta: <strong>{incident.bikeCode}</strong></Text> : null}<Textarea aria-label="Detalle de mantenimiento" description={`${description.length}/${maxTextLength}`} label="Detalle" maxLength={maxTextLength} minRows={3} onChange={(event) => setDescription(event.currentTarget.value)} value={description} /><Button disabled={!valid} loading={isSubmitting} onClick={() => incident && void onCreate(incident, description.trim())}>Iniciar mantenimiento</Button></Stack></Paper>;
}

function MaintenanceRow({ item, onComplete, pending }: Readonly<{ item: MaintenanceResponse; onComplete: (id: number, resolution: string) => Promise<void>; pending: boolean }>) {
  const [resolution, setResolution] = useState('');
  const canComplete = item.status === 'IN_PROGRESS' && resolution.trim().length > 0;
  return <Table.Tr><Table.Td>{item.id}</Table.Td><Table.Td>{item.bikeCode}</Table.Td><Table.Td>{item.incidentId ?? 'Sin incidencia'}</Table.Td><Table.Td>{item.description}</Table.Td><Table.Td>{formatDateTime(item.startedAt)}</Table.Td><Table.Td><StatusBadge status={item.status} /></Table.Td><Table.Td>{item.status === 'IN_PROGRESS' ? <Group gap="xs" wrap="nowrap"><Textarea aria-label={`Resolución mantenimiento ${item.id}`} maxLength={maxTextLength} onChange={(event) => setResolution(event.currentTarget.value)} placeholder="Resolución" value={resolution} /><Button disabled={!canComplete} loading={pending} onClick={() => void onComplete(item.id, resolution.trim())} size="compact-sm">Finalizar</Button></Group> : item.resolution ?? 'Sin resolución'}</Table.Td></Table.Tr>;
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return <Paper className={classes.statePanel} radius="md" p="xl"><Text c="dimmed">{message}</Text></Paper>;
}

function StatusBadge({ status }: Readonly<{ status: IncidentStatus | MaintenanceResponse['status'] }>) {
  return <Badge color={statusColor(status)}>{statusLabel(status)}</Badge>;
}

function statusColor(status: IncidentStatus | MaintenanceResponse['status']) {
  if (status === 'RESOLVED' || status === 'COMPLETED') return 'citypassUrbanGreen';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'red';
  return 'citypassUrbanBlue';
}

function statusLabel(status: IncidentStatus | MaintenanceResponse['status']) {
  return incidentStatusLabels[status as IncidentStatus] ?? maintenanceStatusLabels[status as keyof typeof maintenanceStatusLabels];
}

function nextIncidentStatuses(status: IncidentStatus) {
  if (status === 'OPEN') return ['UNDER_REVIEW', 'RESOLVED', 'REJECTED'] as const;
  if (status === 'UNDER_REVIEW') return ['RESOLVED', 'REJECTED'] as const;
  return [];
}

function administrationErrorMessage(error: unknown) {
  if (!isAxiosError(error)) return 'Verificá la conexión con el backend e intentá nuevamente.';
  if (error.response?.status === 403) return 'El usuario configurado no posee permisos de administrador.';
  if (error.response?.status === 404) return 'El recurso seleccionado ya no está disponible.';
  if (error.response?.status === 409) return 'La operación no puede realizarse con el estado actual.';
  if (error.response?.status === 400) return 'Los datos ingresados no son válidos.';
  return 'No se pudo completar la operación. Intentá nuevamente.';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}
