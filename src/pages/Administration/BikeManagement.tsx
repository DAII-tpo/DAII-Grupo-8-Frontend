import {
  Alert,
  Button,
  Group,
  NativeSelect,
  Paper,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import { bikeService } from "../../services/bikes/bikeService";
import { stationService } from "../../services/stations/stationService";
import type { BikeResponse, BikeStatus } from "../../types/bike";
import type { Station } from "../../types/station";
import classes from "./Administration.module.css";

const initialStatuses: Exclude<BikeStatus, "IN_USE">[] = [
  "AVAILABLE",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "STOLEN",
];
const bikeStatuses: BikeStatus[] = [
  "AVAILABLE",
  "IN_USE",
  "MAINTENANCE",
  "OUT_OF_SERVICE",
  "STOLEN",
];
const bikeStatusLabels: Record<BikeStatus, string> = {
  AVAILABLE: "Disponible",
  IN_USE: "En uso",
  MAINTENANCE: "En mantenimiento",
  OUT_OF_SERVICE: "Fuera de servicio",
  STOLEN: "Robada",
};

const toStatusOptions = (statuses: BikeStatus[]) =>
  statuses.map((status) => ({ value: status, label: bikeStatusLabels[status] }));

export function BikeManagement() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState("");
  const [bikes, setBikes] = useState<BikeResponse[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [code, setCode] = useState("");
  const [model, setModel] = useState("");
  const [createStatus, setCreateStatus] =
    useState<Exclude<BikeStatus, "IN_USE">>("AVAILABLE");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<BikeResponse | null>(null);
  const loadStations = useCallback(async () => {
    try {
      setStations(await stationService.getAll());
    } catch {
      setError("No se pudieron cargar las estaciones.");
    }
  }, []);
  useEffect(() => {
    void Promise.resolve().then(loadStations);
  }, [loadStations]);
  const loadBikes = async (id: string) => {
    setStationId(id);
    setBikes([]);
    if (!id) return;
    try {
      setBikes(await bikeService.getByStation(Number(id)));
    } catch (requestError) {
      setError(message(requestError));
    }
  };
  const create = async () => {
    if (!code.trim() || (createStatus === "AVAILABLE" && !stationId)) return;
    setPending("create");
    try {
      const bike = await bikeService.create({
        code: code.trim(),
        stationId: stationId ? Number(stationId) : null,
        status: createStatus,
        model: model.trim() || null,
        purchaseDate: null,
      });
      if (String(bike.stationId) === stationId)
        setBikes((items) => [...items, bike]);
      setCode("");
      setModel("");
      setSuccess("La bicicleta fue creada.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setPending(null);
    }
  };
  const status = async (bike: BikeResponse, next: BikeStatus) => {
    setPending(`status-${bike.id}`);
    try {
      const updated = await bikeService.changeStatus(bike.id, {
        status: next,
        reason: null,
      });
      setBikes((items) =>
        items.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSuccess("El estado de la bicicleta fue actualizado.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setPending(null);
    }
  };
  const transfer = async (bike: BikeResponse, target: string) => {
    if (!target) return;
    setPending(`transfer-${bike.id}`);
    try {
      const updated = await bikeService.transfer(bike.id, {
        stationId: Number(target),
      });
      setBikes((items) =>
        updated.stationId === Number(stationId)
          ? items.map((item) => (item.id === updated.id ? updated : item))
          : items.filter((item) => item.id !== bike.id),
      );
      setSuccess("La bicicleta fue trasladada.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setPending(null);
    }
  };
  const remove = async () => {
    if (!confirmDelete) return;
    setPending(`delete-${confirmDelete.id}`);
    try {
      await bikeService.remove(confirmDelete.id);
      setBikes((items) => items.filter((item) => item.id !== confirmDelete.id));
      setConfirmDelete(null);
      setSuccess("La bicicleta fue dada de baja.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setPending(null);
    }
  };
  const visible = useMemo(
    () =>
      filter === "ALL" ? bikes : bikes.filter((bike) => bike.status === filter),
    [bikes, filter],
  );
  const stationOptions = [
    { value: "", label: "Seleccioná una estación" },
    ...stations.map((station) => ({
      value: String(station.id),
      label: station.name,
    })),
  ];
  return (
    <Stack gap="lg">
      {error ? <Alert color="red">{error}</Alert> : null}
      {success ? <Alert color="green">{success}</Alert> : null}
      <Paper className={classes.formPanel} p="md">
        <Stack>
          <Title order={2} className={classes.sectionTitle}>
            Alta de bicicleta
          </Title>
          <Group grow>
            <TextInput
              label="Código"
              maxLength={50}
              value={code}
              onChange={(e) => setCode(e.currentTarget.value)}
            />
            <TextInput
              label="Modelo"
              maxLength={100}
              value={model}
              onChange={(e) => setModel(e.currentTarget.value)}
            />
          </Group>
          <Group grow>
            <NativeSelect
              aria-label="Estación de bicicleta"
              label="Estación"
              data={stationOptions}
              value={stationId}
              onChange={(e) => void loadBikes(e.currentTarget.value)}
            />
            <NativeSelect
              aria-label="Estado inicial"
              label="Estado inicial"
              data={toStatusOptions(initialStatuses)}
              value={createStatus}
              onChange={(e) =>
                setCreateStatus(
                  e.currentTarget.value as Exclude<BikeStatus, "IN_USE">,
                )
              }
            />
          </Group>
          <Button
            disabled={
              !code.trim() || (createStatus === "AVAILABLE" && !stationId)
            }
            loading={pending === "create"}
            onClick={() => void create()}
          >
            Crear bicicleta
          </Button>
        </Stack>
      </Paper>
      <Paper className={classes.tablePanel} p="md">
        <Stack>
          <Group grow>
            <NativeSelect
              aria-label="Estación para bicicletas"
              label="Ver bicicletas de estación"
              data={stationOptions}
              value={stationId}
              onChange={(e) => void loadBikes(e.currentTarget.value)}
            />
            <NativeSelect
              aria-label="Filtro de estado"
              label="Filtrar por estado"
              data={[
                { value: "ALL", label: "Todos los estados" },
                ...toStatusOptions(bikeStatuses),
              ]}
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
            />
          </Group>
          {!stationId ? (
            <Text c="dimmed">
              Seleccioná una estación para visualizar sus bicicletas.
            </Text>
          ) : visible.length === 0 ? (
            <Text c="dimmed">
              No hay bicicletas para el filtro seleccionado.
            </Text>
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Código</Table.Th>
                  <Table.Th>Estado</Table.Th>
                  <Table.Th>Acciones</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {visible.map((bike) => (
                  <BikeRow
                    bike={bike}
                    key={bike.id}
                    pending={pending}
                    stations={stations}
                    onStatus={status}
                    onTransfer={transfer}
                    onDelete={setConfirmDelete}
                  />
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Stack>
      </Paper>
      {confirmDelete ? (
        <Alert color="orange" title="Confirmar baja">
          <Group justify="space-between">
            <Text>¿Dar de baja {confirmDelete.code}?</Text>
            <Group>
              <Button
                color="red"
                loading={pending === `delete-${confirmDelete.id}`}
                onClick={() => void remove()}
              >
                Confirmar baja
              </Button>
              <Button variant="default" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
            </Group>
          </Group>
        </Alert>
      ) : null}
    </Stack>
  );
}
function BikeRow({
  bike,
  pending,
  stations,
  onStatus,
  onTransfer,
  onDelete,
}: {
  bike: BikeResponse;
  pending: string | null;
  stations: Station[];
  onStatus: (bike: BikeResponse, status: BikeStatus) => Promise<void>;
  onTransfer: (bike: BikeResponse, station: string) => Promise<void>;
  onDelete: (bike: BikeResponse) => void;
}) {
  const targets = nextStatuses(bike.status);
  return (
    <Table.Tr>
      <Table.Td>{bike.code}</Table.Td>
      <Table.Td>{bikeStatusLabels[bike.status]}</Table.Td>
      <Table.Td>
        <Group>
          <NativeSelect
            aria-label={`Cambiar estado ${bike.code}`}
            data={[
              { value: "", label: "Cambiar estado" },
              ...toStatusOptions(targets),
            ]}
            onChange={(e) =>
              e.currentTarget.value &&
              void onStatus(bike, e.currentTarget.value as BikeStatus)
            }
          />
          <NativeSelect
            aria-label={`Trasladar ${bike.code}`}
            data={[
              { value: "", label: "Trasladar a" },
              ...stations
                .filter((station) => station.id !== bike.stationId)
                .map((station) => ({
                  value: String(station.id),
                  label: station.name,
                })),
            ]}
            onChange={(e) => void onTransfer(bike, e.currentTarget.value)}
            disabled={bike.status === "IN_USE"}
          />
          <Button
            color="red"
            size="compact-sm"
            variant="light"
            disabled={pending !== null}
            onClick={() => onDelete(bike)}
          >
            Baja
          </Button>
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}
function nextStatuses(status: BikeStatus): BikeStatus[] {
  if (status === "AVAILABLE")
    return ["MAINTENANCE", "OUT_OF_SERVICE", "STOLEN"];
  if (status === "MAINTENANCE")
    return ["AVAILABLE", "OUT_OF_SERVICE", "STOLEN"];
  if (status === "OUT_OF_SERVICE") return ["MAINTENANCE", "STOLEN"];
  if (status === "STOLEN") return ["MAINTENANCE", "OUT_OF_SERVICE"];
  return [];
}
function message(error: unknown) {
  if (!isAxiosError(error)) return "No se pudo completar la operación.";
  const apiMessage =
    error.response?.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
      ? error.response.data.message
      : null;
  if (error.response?.status === 409 && apiMessage) return apiMessage;
  if (error.response?.status === 400) return "Revisá los datos ingresados.";
  if (error.response?.status === 404)
    return "El recurso solicitado ya no existe.";
  return "No se pudo completar la operación. Intentá nuevamente.";
}
