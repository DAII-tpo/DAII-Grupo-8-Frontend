import { Alert, Badge, Button, Group, Loader, Modal, NativeSelect, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { isAxiosError } from 'axios';
import { AlertCircle, CheckCircle2, MapPin, Navigation, ShieldAlert } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { MobilityFeatureBanner } from '../../components/mobility/MobilityFeatureBanner';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { RetryErrorAlert } from '../../components/common/RetryErrorAlert';
import { currentUserId } from '../../config/currentUser';
import { incidentService } from '../../services/incidents/incidentService';
import { stationService } from '../../services/stations/stationService';
import { tripService } from '../../services/trips/tripService';
import type { IncidentResponse, IncidentTypeResponse } from '../../types/incident';
import type { NearbyStation } from '../../types/nearbyStation';
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
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [recommendedStation, setRecommendedStation] = useState<NearbyStation | null>(null);
  const [recommendationState, setRecommendationState] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [isReturningBike, setIsReturningBike] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const [returnedStationName, setReturnedStationName] = useState<string | null>(null);

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

  const findNearestStation = useCallback(() => {
    setRecommendedStation(null);
    setReturnError(null);
    setRecommendationState('loading');

    if (!navigator.geolocation) {
      setRecommendationState('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        void stationService.getNearby({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          limit: 5,
        }).then((stations) => {
          const station = stations.find((item) => item.availableSlots > 0) ?? null;
          setRecommendedStation(station);
          setRecommendationState(station ? 'ready' : 'unavailable');
        }).catch(() => setRecommendationState('unavailable'));
      },
      () => setRecommendationState('unavailable'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }, []);

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
      setIsReturnDialogOpen(true);
      findNearestStation();
    } catch (error) {
      setSubmitError(reportErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmBikeReturn = async () => {
    if (userId === null || !activeTrip || !recommendedStation) return;
    setIsReturningBike(true);
    setReturnError(null);
    try {
      await tripService.end(userId, activeTrip.id, { destinationStationId: recommendedStation.stationId });
      setReturnedStationName(recommendedStation.stationName);
      setActiveTrip(null);
      setIsReturnDialogOpen(false);
    } catch (error) {
      setReturnError(returnTripErrorMessage(error));
    } finally {
      setIsReturningBike(false);
    }
  };

  const reportAnother = () => {
    setIncidentTypeId('');
    setDescription('');
    setSubmitError(null);
    setReportedIncident(null);
    setReturnedStationName(null);
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Reportar un problema"
        subtitle="Informá una incidencia relacionada con la bicicleta que estás utilizando."
      />
      <MobilityNavigation />

      <MobilityFeatureBanner
        description="Durante un viaje activo podés informar un problema y asociarlo directamente con la bicicleta que estás usando."
        icon={ShieldAlert}
        label="Asistencia durante el viaje"
        title="Reportá una incidencia de forma clara y rápida"
        tone="red"
      />

      {isLoading ? <LoadingState /> : null}
      {hasLoadError ? <LoadErrorState onRetry={() => void loadFormData()} /> : null}
      {!isLoading && !hasLoadError && reportedIncident ? (
        <SuccessState
          incident={reportedIncident}
          onOpenReturn={() => {
            setIsReturnDialogOpen(true);
            if (recommendationState === 'idle') findNearestStation();
          }}
          onReportAnother={reportAnother}
          returnedStationName={returnedStationName}
        />
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
      <BikeReturnModal
        isReturning={isReturningBike}
        opened={isReturnDialogOpen}
        onClose={() => setIsReturnDialogOpen(false)}
        onConfirm={() => void confirmBikeReturn()}
        onRetry={findNearestStation}
        recommendationState={recommendationState}
        returnError={returnError}
        station={recommendedStation}
      />
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
    <Paper className={classes.emptyState} radius="md" p="xl">
      <Stack align="center" gap="xs">
        <AlertCircle className={classes.emptyStateIcon} size={30} />
        <Title className={classes.emptyStateTitle} order={2}>No tenés ningún viaje activo</Title>
        <Text c="dimmed" maw={440} ta="center">
          Para reportar un problema, primero necesitás tener una bicicleta en uso.
        </Text>
      </Stack>
    </Paper>
  );
}

function NoTypesState() {
  return (
    <Paper className={classes.emptyState} radius="md" p="xl">
      <Stack align="center" gap="xs">
        <AlertCircle className={classes.emptyStateIcon} size={30} />
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

type SuccessStateProps = {
  incident: IncidentResponse;
  onOpenReturn: () => void;
  onReportAnother: () => void;
  returnedStationName: string | null;
};

function SuccessState({ incident, onOpenReturn, onReportAnother, returnedStationName }: SuccessStateProps) {
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
          <Badge color="citypassUrbanGreen" variant="filled">Registrado</Badge>
        </Group>
        <Text c="dimmed" size="sm">Registrado: {formatDateTime(incident.reportedAt)}</Text>
        {returnedStationName ? (
          <Alert color="green" icon={<CheckCircle2 size={18} />} title="Bicicleta entregada">
            Confirmaste la devolución en {returnedStationName}. El viaje quedó finalizado.
          </Alert>
        ) : (
          <Alert color="orange" icon={<MapPin size={18} />} title="Falta devolver la bicicleta">
            Por seguridad, dejala en la estación sugerida y confirmá la entrega.
          </Alert>
        )}
        <Group grow>
          {!returnedStationName ? <Button leftSection={<Navigation size={17} />} onClick={onOpenReturn}>Ver estación sugerida</Button> : null}
          <Button variant="light" onClick={onReportAnother}>Cerrar reporte</Button>
        </Group>
      </Stack>
    </Paper>
  );
}

type BikeReturnModalProps = {
  isReturning: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRetry: () => void;
  opened: boolean;
  recommendationState: 'idle' | 'loading' | 'ready' | 'unavailable';
  returnError: string | null;
  station: NearbyStation | null;
};

function BikeReturnModal({ isReturning, onClose, onConfirm, onRetry, opened, recommendationState, returnError, station }: BikeReturnModalProps) {
  return (
    <Modal centered onClose={onClose} opened={opened} size="md" title="Devolvé la bicicleta de forma segura">
      <Stack gap="md">
        <Text c="dimmed" size="sm">Después de reportar una incidencia, acercá la bicicleta a la estación disponible más cercana.</Text>
        {recommendationState === 'loading' ? (
          <Paper className={classes.locationState} p="lg" radius="md"><Loader color="citypassUrbanBlue" size="sm" /><Text>Buscando la estación más cercana...</Text></Paper>
        ) : null}
        {recommendationState === 'unavailable' ? (
          <Alert color="orange" icon={<MapPin size={18} />} title="No pudimos sugerir una estación">
            Permití el acceso a tu ubicación e intentá nuevamente. Mientras tanto, no dejes la bicicleta fuera de una estación.
          </Alert>
        ) : null}
        {station ? (
          <Paper className={classes.stationRecommendation} p="md" radius="md">
            <Group align="flex-start" wrap="nowrap">
              <div className={classes.stationIcon}><MapPin size={22} /></div>
              <div>
                <Text fw={800}>{station.stationName}</Text>
                <Text c="dimmed" size="sm">{station.address}</Text>
                <Text className={classes.stationDistance} size="sm">A {formatDistance(station.distanceMeters)} · {station.availableSlots} espacios libres</Text>
              </div>
            </Group>
          </Paper>
        ) : null}
        {returnError ? <Alert color="red" icon={<AlertCircle size={18} />} title="No se pudo confirmar la devolución">{returnError}</Alert> : null}
        <Group justify="flex-end">
          <Button onClick={onClose} variant="default">Lo haré después</Button>
          {recommendationState === 'unavailable' ? <Button onClick={onRetry} variant="light">Volver a buscar</Button> : null}
          {station ? <Button color="citypassUrbanGreen" loading={isReturning} onClick={onConfirm}>Confirmar que la dejé acá</Button> : null}
        </Group>
      </Stack>
    </Modal>
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

function returnTripErrorMessage(error: unknown) {
  if (isAxiosError(error) && error.response?.status === 409) {
    return 'La estación ya no tiene espacios disponibles. Volvé a buscar otra estación cercana.';
  }
  return 'No pudimos finalizar el viaje. Verificá que la bicicleta esté anclada e intentá nuevamente.';
}

function formatDistance(distanceMeters: number) {
  if (distanceMeters < 1_000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
