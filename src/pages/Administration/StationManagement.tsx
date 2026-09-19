import {
  Alert,
  Button,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useState } from "react";

import { stationService } from "../../services/stations/stationService";
import type {
  Station,
  StationRequest,
  StationStatus,
} from "../../types/station";
import classes from "./Administration.module.css";

const emptyForm: StationRequest = {
  name: "",
  address: null,
  latitude: -34.6,
  longitude: -58.4,
  capacity: 10,
  status: "ACTIVE",
};
const stationStatusOptions = [
  { value: "ACTIVE", label: "Activa" },
  { value: "INACTIVE", label: "Inactiva" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
];
const stationStatusLabels: Record<StationStatus, string> = {
  ACTIVE: "Activa",
  INACTIVE: "Inactiva",
  MAINTENANCE: "En mantenimiento",
};

export function StationManagement({ bikeCountByStation }: { bikeCountByStation: ReadonlyMap<number, number> }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [form, setForm] = useState<StationRequest>(emptyForm);
  const [editing, setEditing] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [stationToDeactivate, setStationToDeactivate] =
    useState<Station | null>(null);

  const loadStations = useCallback(async () => {
    setLoading(true);
    try {
      setStations(await stationService.getAll());
      setError(null);
    } catch {
      setError("No se pudieron cargar las estaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadStations);
  }, [loadStations]);

  const handleCancelEdit = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!isValidStationRequest(form)) return;

    setPending(true);
    setError(null);
    try {
      const savedStation = editing
        ? await stationService.update(editing.id, form)
        : await stationService.create(form);
      setStations((current) =>
        updateStationList(current, savedStation, editing !== null),
      );
      setSuccess(
        editing ? "La estación fue actualizada." : "La estación fue creada.",
      );
      handleCancelEdit();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  const handleEdit = (station: Station) => {
    setEditing(station);
    setForm(stationToRequest(station));
  };

  const handleDeactivate = async () => {
    if (!stationToDeactivate) return;

    setPending(true);
    try {
      const updatedStation = await stationService.update(
        stationToDeactivate.id,
        buildInactiveStationRequest(stationToDeactivate),
      );
      setStations((current) =>
        updateStationList(current, updatedStation, true),
      );
      setSuccess("La estación fue desactivada.");
      setStationToDeactivate(null);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setPending(false);
    }
  };

  return (
    <Stack gap="lg">
      {error ? <Alert color="red">{error}</Alert> : null}
      {success ? <Alert color="green">{success}</Alert> : null}
      <StationForm
        editing={editing !== null}
        form={form}
        pending={pending}
        onCancel={handleCancelEdit}
        onChange={setForm}
        onSave={() => void handleSave()}
      />
      <DeactivateConfirmation
        pending={pending}
        station={stationToDeactivate}
        onCancel={() => setStationToDeactivate(null)}
        onConfirm={() => void handleDeactivate()}
      />
      <StationTable
        bikeCountByStation={bikeCountByStation}
        loading={loading}
        stations={stations}
        onDeactivate={setStationToDeactivate}
        onEdit={handleEdit}
      />
    </Stack>
  );
}

function StationForm({
  editing,
  form,
  pending,
  onCancel,
  onChange,
  onSave,
}: {
  editing: boolean;
  form: StationRequest;
  pending: boolean;
  onCancel: () => void;
  onChange: (form: StationRequest) => void;
  onSave: () => void;
}) {
  const updateField = <Key extends keyof StationRequest>(
    key: Key,
    value: StationRequest[Key],
  ) => onChange({ ...form, [key]: value });

  return (
    <Paper className={classes.formPanel} p="md">
      <Stack>
        <Title order={2} className={classes.sectionTitle}>
          {editing ? "Editar estación" : "Crear estación"}
        </Title>
        <TextInput
          label="Nombre"
          maxLength={150}
          value={form.name}
          onChange={(event) => updateField("name", event.currentTarget.value)}
        />
        <TextInput
          label="Dirección"
          maxLength={255}
          value={form.address ?? ""}
          onChange={(event) =>
            updateField("address", event.currentTarget.value || null)
          }
        />
        <Group grow>
          <NumberInput
            label="Latitud"
            value={form.latitude}
            onChange={(value) => updateField("latitude", Number(value))}
          />
          <NumberInput
            label="Longitud"
            value={form.longitude}
            onChange={(value) => updateField("longitude", Number(value))}
          />
          <NumberInput
            label="Capacidad"
            min={1}
            max={1000}
            value={form.capacity}
            onChange={(value) => updateField("capacity", Number(value))}
          />
        </Group>
        <NativeSelect
          label="Estado"
          value={form.status}
          data={stationStatusOptions}
          onChange={(event) =>
            updateField("status", event.currentTarget.value as StationStatus)
          }
        />
        <Group>
          <Button loading={pending} onClick={onSave}>
            {editing ? "Guardar cambios" : "Crear estación"}
          </Button>
          {editing ? (
            <Button variant="default" onClick={onCancel}>
              Cancelar
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );
}

function StationTable({
  bikeCountByStation,
  loading,
  stations,
  onDeactivate,
  onEdit,
}: {
  bikeCountByStation: ReadonlyMap<number, number>;
  loading: boolean;
  stations: Station[];
  onDeactivate: (station: Station) => void;
  onEdit: (station: Station) => void;
}) {
  if (loading) return <Text>Cargando estaciones...</Text>;
  if (stations.length === 0)
    return <Text c="dimmed">No hay estaciones registradas.</Text>;

  return (
    <Paper className={classes.tablePanel} p="md">
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Nombre</Table.Th>
            <Table.Th>Dirección</Table.Th>
            <Table.Th>Ocupación</Table.Th>
            <Table.Th>Estado</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {stations.map((station) => (
            <StationRow
              key={station.id}
              bikeCount={bikeCountByStation.get(station.id) ?? 0}
              station={station}
              onDeactivate={onDeactivate}
              onEdit={onEdit}
            />
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

function StationRow({
  bikeCount,
  station,
  onDeactivate,
  onEdit,
}: {
  bikeCount: number;
  station: Station;
  onDeactivate: (station: Station) => void;
  onEdit: (station: Station) => void;
}) {
  const occupancyPercentage = station.capacity === 0 ? 0 : Math.min(100, bikeCount / station.capacity * 100);
  return (
    <Table.Tr>
      <Table.Td>{station.name}</Table.Td>
      <Table.Td>{station.address || "Sin dirección"}</Table.Td>
      <Table.Td>
        <div className={classes.inlineOccupancy}>
          <Group gap="xs" justify="space-between" wrap="nowrap">
            <Text fw={750} size="sm">{bikeCount} / {station.capacity}</Text>
            <Text c="dimmed" size="xs">bicicletas</Text>
          </Group>
          <div className={classes.inlineCapacityTrack}>
            <div className={classes.inlineCapacityFill} style={{ width: `${occupancyPercentage}%` }} />
          </div>
        </div>
      </Table.Td>
      <Table.Td>{stationStatusLabels[station.status]}</Table.Td>
      <Table.Td>
        <Group>
          <Button
            size="compact-sm"
            variant="light"
            onClick={() => onEdit(station)}
          >
            Editar
          </Button>
          {station.status !== "INACTIVE" ? (
            <Button
              size="compact-sm"
              color="red"
              variant="light"
              onClick={() => onDeactivate(station)}
            >
              Desactivar
            </Button>
          ) : null}
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

function DeactivateConfirmation({
  pending,
  station,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  station: Station | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!station) return null;
  return (
    <Alert color="orange" title="Confirmar desactivación">
      <Group justify="space-between">
        <Text>¿Desactivar {station.name}?</Text>
        <Group>
          <Button color="red" loading={pending} onClick={onConfirm}>
            Desactivar
          </Button>
          <Button variant="default" onClick={onCancel}>
            Cancelar
          </Button>
        </Group>
      </Group>
    </Alert>
  );
}

function stationToRequest(station: Station): StationRequest {
  return {
    name: station.name,
    address: station.address || null,
    latitude: station.latitude,
    longitude: station.longitude,
    capacity: station.capacity,
    status: station.status,
  };
}

function buildInactiveStationRequest(station: Station): StationRequest {
  return { ...stationToRequest(station), status: "INACTIVE" };
}
function updateStationList(
  stations: Station[],
  station: Station,
  isUpdate: boolean,
): Station[] {
  return isUpdate
    ? stations.map((current) => (current.id === station.id ? station : current))
    : [...stations, station];
}
function isValidStationRequest(request: StationRequest): boolean {
  return request.name.trim().length > 0 && request.capacity > 0;
}
function getErrorMessage(error: unknown): string {
  if (!isAxiosError(error)) return "No se pudo completar la operación.";
  if (error.response?.status === 400) return "Revisá los datos ingresados.";
  if (error.response?.status === 404)
    return "El recurso solicitado ya no existe.";
  return "No se pudo completar la operación. Intentá nuevamente.";
}
