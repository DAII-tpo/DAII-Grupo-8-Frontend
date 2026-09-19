import { Alert, Badge, Button, Group, Loader, NativeSelect, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { incidentService } from '../../services/incidents/incidentService';
import { tripService } from '../../services/trips/tripService';
import type { IncidentResponse, IncidentTypeResponse } from '../../types/incident';
import type { TripResponse } from '../../types/trip';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './Reports.module.css';

const maxDescriptionLength = 2000;

export function ReportsPage() {
  const userId = currentUserId;
  const [activeTrip, setActiveTrip] = useState<TripResponse | null>(null);
  const [types, setTypes] = useState<IncidentTypeResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [incidentTypeId, setIncidentTypeId] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reportedIncident, setReportedIncident] = useState<IncidentResponse | null>(null);

  const loadFormData = useCallback(async () => {
    setIsLoading(true);
    setHasLoadError(false);

    if (userId === null) {
      setHasLoadError(true);
      setIsLoading(false);
      return;
    }

    try {
      const [loadedTypes, trip] = await Promise.all([
        incidentService.getTypes(),
        tripService.getActive(userId),
      ]);
      setTypes(loadedTypes);
      setActiveTrip(trip);
    } catch {
      setHasLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void Promise.resolve().then(loadFormData);
  }, [loadFormData]);

  const selectedType = useMemo(
    () => types.find((type) => type.id === Number(incidentTypeId)),
    [incidentTypeId, types],
  );
  const isDescriptionValid = description.trim().length > 0 && description.length <= maxDescriptionLength;
  const canSubmit = activeTrip !== null && incidentTypeId !== '' && isDescriptionValid && !isSubmitting;

  const submit = async () => {
    if (userId === null || !activeTrip || !selectedType || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const incident = await incidentService.report(userId, {
        bikeId: activeTrip.bikeId,
        incidentTypeId: selectedType.id,
        description: description.trim(),
      });
      setReportedIncident(incident);
    } catch (error) {
      setSubmitError(reportErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const reportAnother = () => {
    setIncidentTypeId('');
    setDescription('');
    setSubmitError(null);
    setReportedIncident(null);
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Reportar un problema"
        subtitle="Informá una incidencia relacionada con la bicicleta que estás utilizando."
      />
      <MobilityNavigation />

      {isLoading ? <LoadingState /> : null}
      {hasLoadError ? <LoadErrorState onRetry={() => void loadFormData()} /> : null}
      {!isLoading && !hasLoadError && reportedIncident ? (
        <SuccessState incident={reportedIncident} onReportAnother={reportAnother} />
      ) : null}
      {!isLoading && !hasLoadError && !reportedIncident && activeTrip === null ? <NoActiveTripState /> : null}
      {!isLoading && !hasLoadError && !reportedIncident && activeTrip && types.length === 0 ? <NoTypesState /> : null}
      {!isLoading && !hasLoadError && !reportedIncident && activeTrip && types.length > 0 ? (
        <ReportForm
          activeTrip={activeTrip}
          description={description}
          incidentTypeId={incidentTypeId}
          isSubmitting={isSubmitting}
          onDescriptionChange={setDescription}
          onIncidentTypeChange={setIncidentTypeId}
          onSubmit={() => void submit()}
          selectedType={selectedType}
          submitError={submitError}
          types={types}
        />
      ) : null}
    </Stack>
  );
}

function LoadingState() {
  return (
    <Paper className={classes.statePanel} radius="md" p="xl">
      <Stack align="center" gap="sm">
        <Loader color="citypassUrbanBlue" />
        <Text c="dimmed">Cargando datos para el reporte...</Text>
      </Stack>
    </Paper>
  );
}

function LoadErrorState({ onRetry }: { onRetry: () => void }) {
  return <RetryErrorAlert message="Verificá que el backend esté disponible e intentá nuevamente." onRetry={onRetry} title="No se pudo preparar el reporte" />;
}

function NoActiveTripState() {
  return (
    <Paper className={`${classes.emptyState} ${classes.emptyStateDanger}`} radius="lg" p="xl">
      <Stack align="center" gap="sm">
        <div className={classes.emptyStateIcon}><AlertCircle size={28} /></div>
        <Title className={classes.emptyStateTitle} order={2}>No tenés un viaje activo</Title>
        <Text c="dimmed" maw={440} ta="center">
          Para reportar un problema, primero necesitás tener una bicicleta en uso.
        </Text>
        <Button
          color="red"
          mt="xs"
          renderRoot={(props) => <NavLink {...props} to="/movilidad/bicicletas" />}
          variant="light"
        >
          Ir a Bicicletas/Viajes
        </Button>
      </Stack>
    </Paper>
  );
}

function NoTypesState() {
  return (
    <Paper className={`${classes.emptyState} ${classes.emptyStateDanger}`} radius="lg" p="xl">
      <Stack align="center" gap="sm">
        <div className={classes.emptyStateIcon}><AlertCircle size={28} /></div>
        <Title className={classes.emptyStateTitle} order={2}>No hay tipos de incidencia disponibles</Title>
        <Text c="dimmed" maw={440} ta="center">No se puede enviar un reporte hasta que existan tipos activos.</Text>
      </Stack>
    </Paper>
  );
}

type ReportFormProps = {
  activeTrip: TripResponse;
  description: string;
  incidentTypeId: string;
  isSubmitting: boolean;
  onDescriptionChange: (description: string) => void;
  onIncidentTypeChange: (incidentTypeId: string) => void;
  onSubmit: () => void;
  selectedType: IncidentTypeResponse | undefined;
  submitError: string | null;
  types: IncidentTypeResponse[];
};

function ReportForm({
  activeTrip,
  description,
  incidentTypeId,
  isSubmitting,
  onDescriptionChange,
  onIncidentTypeChange,
  onSubmit,
  selectedType,
  submitError,
  types,
}: ReportFormProps) {
  const isDescriptionValid = description.trim().length > 0 && description.length <= maxDescriptionLength;
  const canSubmit = incidentTypeId !== '' && isDescriptionValid && !isSubmitting;

  return (
    <Paper className={classes.formPanel} radius="md" p="lg">
      <Stack gap="md">
        <div>
          <Title className={classes.sectionTitle} order={2}>Informá un problema de tu bicicleta</Title>
          <Text c="dimmed" size="sm">Bicicleta en uso: {activeTrip.bikeCode}</Text>
        </div>

        <NativeSelect
          aria-label="Tipo de problema"
          data={[{ label: 'Seleccioná un tipo de problema', value: '' }, ...types.map((type) => ({ label: type.name, value: String(type.id) }))]}
          label="Tipo de problema"
          onChange={(event) => onIncidentTypeChange(event.currentTarget.value)}
          value={incidentTypeId}
        />
        {selectedType ? <Text c="dimmed" size="sm">{selectedType.description}</Text> : null}

        <Textarea
          aria-label="Descripción"
          description={`${description.length}/${maxDescriptionLength}`}
          label="Descripción"
          maxLength={maxDescriptionLength}
          minRows={4}
          onChange={(event) => onDescriptionChange(event.currentTarget.value)}
          placeholder="Describí el problema que detectaste"
          required
          value={description}
        />

        {submitError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo enviar el reporte">{submitError}</Alert> : null}
        <Button disabled={!canSubmit} loading={isSubmitting} onClick={onSubmit}>Enviar reporte</Button>
      </Stack>
    </Paper>
  );
}

function SuccessState({ incident, onReportAnother }: { incident: IncidentResponse; onReportAnother: () => void }) {
  return (
    <Paper className={classes.successPanel} radius="md" p="lg">
      <Stack gap="md">
        <Group gap="sm">
          <CheckCircle2 className={classes.successIcon} size={24} />
          <div>
            <Title className={classes.sectionTitle} order={2}>Reporte enviado</Title>
            <Text c="dimmed" size="sm">La incidencia fue registrada correctamente.</Text>
          </div>
        </Group>
        <Group justify="space-between" wrap="wrap">
          <Text><strong>{incident.incidentTypeName}</strong> en {incident.bikeCode}</Text>
          <Badge color="citypassUrbanGreen" variant="filled">{incident.status}</Badge>
        </Group>
        <Text c="dimmed" size="sm">Registrado: {formatDateTime(incident.reportedAt)}</Text>
        <Button variant="light" onClick={onReportAnother}>Reportar otro problema</Button>
      </Stack>
    </Paper>
  );
}

function reportErrorMessage(error: unknown) {
  if (!isAxiosError(error)) {
    return 'No fue posible enviar el reporte. Intentá nuevamente.';
  }

  switch (error.response?.status) {
    case 400:
      return 'Revisá el tipo de problema y la descripción antes de reenviar.';
    case 404:
      return 'La bicicleta o el tipo seleccionado ya no están disponibles.';
    case 409:
      return 'Tu usuario no está habilitado para reportar incidencias.';
    default:
      return 'No fue posible enviar el reporte. Intentá nuevamente.';
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
