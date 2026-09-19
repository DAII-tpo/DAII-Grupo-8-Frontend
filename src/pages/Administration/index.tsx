import { Alert, Badge, Button, Group, Loader, NativeSelect, Paper, ScrollArea, Stack, Tabs, Table, Text, Textarea, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { incidentService } from '../../services/incidents/incidentService';
import { maintenanceService } from '../../services/maintenance/maintenanceService';
import { BikeManagement } from './BikeManagement';
import { StationManagement } from './StationManagement';
import type { AdminIncidentResponse, IncidentStatus } from '../../types/incident';
import type { MaintenanceResponse } from '../../types/maintenance';
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
  const userId = currentUserId;
  const [incidents, setIncidents] = useState<AdminIncidentResponse[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadAdministrationData = useCallback(async () => {
    if (userId === null) {
      setLoadError('No hay un usuario configurado para realizar operaciones administrativas.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const [loadedIncidents, loadedMaintenance] = await Promise.all([
        incidentService.getAll(userId),
        maintenanceService.getAll(userId),
      ]);
      setIncidents(loadedIncidents);
      setMaintenance(loadedMaintenance);
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
      />

      {isLoading ? <LoadingState /> : null}
      {loadError ? <LoadError message={loadError} onRetry={() => void loadAdministrationData()} /> : null}
      {!isLoading && !loadError ? (
        <>
          {actionError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo completar la operación">{actionError}</Alert> : null}
          {actionSuccess ? <Alert color="green" icon={<CheckCircle2 size={18} />} title="Operación realizada">{actionSuccess}</Alert> : null}
          <Tabs defaultValue="incidents" keepMounted={false}>
            <Tabs.List>
              <Tabs.Tab value="incidents">Incidencias</Tabs.Tab>
              <Tabs.Tab value="maintenance">Mantenimiento</Tabs.Tab>
              <Tabs.Tab value="stations">Estaciones</Tabs.Tab>
              <Tabs.Tab value="bikes">Bicicletas</Tabs.Tab>
            </Tabs.List>
            <Tabs.Panel pt="md" value="incidents">
              <IncidentsPanel incidents={incidents} onUpdate={updateIncident} pendingAction={pendingAction} />
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="maintenance">
              <MaintenancePanel
                incidents={incidents}
                maintenance={maintenance}
                onComplete={completeMaintenance}
                onCreate={createMaintenance}
                pendingAction={pendingAction}
              />
            </Tabs.Panel>
            <Tabs.Panel pt="md" value="stations"><StationManagement /></Tabs.Panel>
            <Tabs.Panel pt="md" value="bikes"><BikeManagement /></Tabs.Panel>
          </Tabs>
        </>
      ) : null}
    </Stack>
  );
}

function LoadingState() {
  return <Paper className={classes.statePanel} radius="md" p="xl"><Stack align="center"><Loader color="citypassUrbanBlue" /><Text c="dimmed">Cargando información administrativa...</Text></Stack></Paper>;
}

function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <RetryErrorAlert message={message} onRetry={onRetry} title="No se pudo cargar la administración" />;
}

function IncidentsPanel({ incidents, onUpdate, pendingAction }: { incidents: AdminIncidentResponse[]; onUpdate: (id: number, status: IncidentStatus) => Promise<void>; pendingAction: string | null }) {
  if (incidents.length === 0) return <EmptyState message="No hay incidencias registradas." />;

  return <Paper className={classes.tablePanel} radius="md" p="md"><ScrollArea><Table miw={900} verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Bicicleta</Table.Th><Table.Th>Tipo</Table.Th><Table.Th>Descripción</Table.Th><Table.Th>Usuario</Table.Th><Table.Th>Fecha</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Acciones</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{incidents.map((incident) => <IncidentRow incident={incident} key={incident.id} onUpdate={onUpdate} pending={pendingAction === `incident-${incident.id}`} />)}</Table.Tbody></Table></ScrollArea></Paper>;
}

function IncidentRow({ incident, onUpdate, pending }: { incident: AdminIncidentResponse; onUpdate: (id: number, status: IncidentStatus) => Promise<void>; pending: boolean }) {
  const transitions = nextIncidentStatuses(incident.status);
  return <Table.Tr><Table.Td>{incident.id}</Table.Td><Table.Td>{incident.bikeCode}</Table.Td><Table.Td>{incident.incidentTypeName}</Table.Td><Table.Td>{incident.description}</Table.Td><Table.Td>{incident.reportedByUserEmail}</Table.Td><Table.Td>{formatDateTime(incident.reportedAt)}</Table.Td><Table.Td><StatusBadge status={incident.status} /></Table.Td><Table.Td><Group gap="xs" wrap="nowrap">{transitions.map((status) => <Button disabled={pending} key={status} loading={pending} onClick={() => void onUpdate(incident.id, status)} size="compact-sm" variant="light">{incidentStatusLabels[status]}</Button>)}</Group></Table.Td></Table.Tr>;
}

function MaintenancePanel({ incidents, maintenance, onComplete, onCreate, pendingAction }: { incidents: AdminIncidentResponse[]; maintenance: MaintenanceResponse[]; onComplete: (id: number, resolution: string) => Promise<void>; onCreate: (incident: AdminIncidentResponse, description: string) => Promise<void>; pendingAction: string | null }) {
  return <Stack gap="lg"><CreateMaintenanceForm incidents={incidents} isSubmitting={pendingAction === 'create-maintenance'} onCreate={onCreate} />{maintenance.length === 0 ? <EmptyState message="No hay mantenimientos registrados." /> : <Paper className={classes.tablePanel} radius="md" p="md"><ScrollArea><Table miw={800} verticalSpacing="sm"><Table.Thead><Table.Tr><Table.Th>ID</Table.Th><Table.Th>Bicicleta</Table.Th><Table.Th>Incidencia</Table.Th><Table.Th>Detalle</Table.Th><Table.Th>Inicio</Table.Th><Table.Th>Estado</Table.Th><Table.Th>Finalizar</Table.Th></Table.Tr></Table.Thead><Table.Tbody>{maintenance.map((item) => <MaintenanceRow item={item} key={item.id} onComplete={onComplete} pending={pendingAction === `maintenance-${item.id}`} />)}</Table.Tbody></Table></ScrollArea></Paper>}</Stack>;
}

function CreateMaintenanceForm({ incidents, isSubmitting, onCreate }: { incidents: AdminIncidentResponse[]; isSubmitting: boolean; onCreate: (incident: AdminIncidentResponse, description: string) => Promise<void> }) {
  const [incidentId, setIncidentId] = useState('');
  const [description, setDescription] = useState('');
  const incident = useMemo(() => incidents.find((item) => item.id === Number(incidentId)), [incidentId, incidents]);
  const valid = incident !== undefined && description.trim().length > 0;
  return <Paper className={classes.formPanel} radius="md" p="lg"><Stack gap="md"><div><Title className={classes.sectionTitle} order={2}>Enviar bicicleta a mantenimiento</Title><Text c="dimmed" size="sm">Seleccioná una incidencia para asociar la bicicleta real reportada.</Text></div><NativeSelect aria-label="Incidencia para mantenimiento" data={[{ label: 'Seleccioná una incidencia', value: '' }, ...incidents.map((item) => ({ label: `#${item.id} · ${item.bikeCode} · ${item.incidentTypeName}`, value: String(item.id) }))]} label="Incidencia" onChange={(event) => setIncidentId(event.currentTarget.value)} value={incidentId} />{incident ? <Text size="sm">Bicicleta: <strong>{incident.bikeCode}</strong></Text> : null}<Textarea aria-label="Detalle de mantenimiento" description={`${description.length}/${maxTextLength}`} label="Detalle" maxLength={maxTextLength} minRows={3} onChange={(event) => setDescription(event.currentTarget.value)} value={description} /><Button disabled={!valid} loading={isSubmitting} onClick={() => incident && void onCreate(incident, description.trim())}>Iniciar mantenimiento</Button></Stack></Paper>;
}

function MaintenanceRow({ item, onComplete, pending }: { item: MaintenanceResponse; onComplete: (id: number, resolution: string) => Promise<void>; pending: boolean }) {
  const [resolution, setResolution] = useState('');
  const canComplete = item.status === 'IN_PROGRESS' && resolution.trim().length > 0;
  return <Table.Tr><Table.Td>{item.id}</Table.Td><Table.Td>{item.bikeCode}</Table.Td><Table.Td>{item.incidentId ?? 'Sin incidencia'}</Table.Td><Table.Td>{item.description}</Table.Td><Table.Td>{formatDateTime(item.startedAt)}</Table.Td><Table.Td><StatusBadge status={item.status} /></Table.Td><Table.Td>{item.status === 'IN_PROGRESS' ? <Group gap="xs" wrap="nowrap"><Textarea aria-label={`Resolución mantenimiento ${item.id}`} maxLength={maxTextLength} onChange={(event) => setResolution(event.currentTarget.value)} placeholder="Resolución" value={resolution} /><Button disabled={!canComplete} loading={pending} onClick={() => void onComplete(item.id, resolution.trim())} size="compact-sm">Finalizar</Button></Group> : item.resolution ?? 'Sin resolución'}</Table.Td></Table.Tr>;
}

function EmptyState({ message }: { message: string }) {
  return <Paper className={classes.statePanel} radius="md" p="xl"><Text c="dimmed">{message}</Text></Paper>;
}

function StatusBadge({ status }: { status: IncidentStatus | MaintenanceResponse['status'] }) {
  return <Badge color={status === 'RESOLVED' || status === 'COMPLETED' ? 'citypassUrbanGreen' : status === 'REJECTED' || status === 'CANCELLED' ? 'red' : 'citypassUrbanBlue'}>{incidentStatusLabels[status as IncidentStatus] ?? maintenanceStatusLabels[status as keyof typeof maintenanceStatusLabels]}</Badge>;
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
