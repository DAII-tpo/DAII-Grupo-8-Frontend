import {
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import {
  Bike,
  ClipboardList,
  Clock,
  History,
  MapPin,
  Navigation,
  ParkingCircle,
  Route,
  Search,
  Settings,
} from 'lucide-react';
import type { ComponentType, ReactNode } from 'react';

import classes from './Mobility.module.css';

type MobilityArea = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  value: string;
};

const mapMarkers = [
  { availableBikes: 8, name: 'Estacion Centro', x: 18, y: 18 },
  { availableBikes: 5, name: 'Estacion Plaza Norte', x: 42, y: 26 },
  { availableBikes: 10, name: 'Estacion Parque', x: 72, y: 36 },
  { availableBikes: 3, name: 'Estacion Universidad', x: 36, y: 52 },
  { availableBikes: 6, name: 'Estacion Sur', x: 68, y: 70 },
  { availableBikes: 4, name: 'Estacion Oeste', x: 30, y: 84 },
  { availableBikes: 12, name: 'Estacion Plaza Central', x: 58, y: 16 },
  { availableBikes: 7, name: 'Estacion Chacabuco', x: 82, y: 18 },
  { availableBikes: 2, name: 'Estacion Ribera', x: 12, y: 48 },
  { availableBikes: 9, name: 'Estacion Norte', x: 56, y: 46 },
  { availableBikes: 6, name: 'Estacion Terminal', x: 44, y: 76 },
];

const mobilityAreas: MobilityArea[] = [
  { icon: Bike, label: 'Bicicletas', value: '12 disponibles' },
  { icon: ParkingCircle, label: 'Estaciones', value: '6 cercanas' },
  { icon: Route, label: 'Viaje activo', value: 'Sin viaje iniciado' },
  { icon: History, label: 'Historial', value: 'Preparado' },
  { icon: ClipboardList, label: 'Reportes', value: 'Preparado' },
  {
    icon: Settings,
    label: 'Administracion',
    value: 'Preparado',
  },
];

export function MobilityPage() {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title className={classes.title} order={1}>
            Movilidad Urbana
          </Title>
          <Text className={classes.subtitle}>
            Vista inicial preparada para mapa, estaciones, bicicletas, viajes y
            gestion del modulo.
          </Text>
        </Stack>
        <Badge className={classes.statusBadge}>Maqueta inicial</Badge>
      </Group>

      <Tabs defaultValue="bicicletas" classNames={{ list: classes.tabsList }}>
        <Tabs.List>
          <Tabs.Tab value="bicicletas">Bicicletas</Tabs.Tab>
          <Tabs.Tab value="estacionamientos">Estacionamientos</Tabs.Tab>
          <Tabs.Tab value="rutas">Rutas</Tabs.Tab>
          <Tabs.Tab value="transporte">Transporte Publico</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <section className={classes.mapLayout}>
        <Paper className={classes.mapPanel} radius="md">
          <TextInput
            className={classes.search}
            leftSection={<Search size={16} />}
            placeholder="Buscar estacion o direccion"
          />
          <div className={classes.mapCanvas} aria-label="Mapa de movilidad">
            <div className={classes.mapGrid} />
            {mapMarkers.map((marker, index) => {
              return (
                <div
                  key={marker.name}
                  className={classes.stationMarker}
                  style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                  aria-label={`${marker.name}: ${marker.availableBikes} bicicletas disponibles`}
                >
                  <ParkingCircle size={18} />
                  <span className={classes.stationCount}>
                    {marker.availableBikes}
                  </span>
                  <span className={classes.markerNumber}>{index + 1}</span>
                </div>
              );
            })}
          </div>
        </Paper>

        <Stack gap="md">
          <Paper className={classes.stationCard} radius="md" p="lg">
            <Group justify="space-between" align="flex-start">
              <Title className={classes.cardTitle} order={2}>
                Estacion Plaza Norte
              </Title>
              <Navigation size={18} />
            </Group>

            <Stack gap="sm">
              <Group gap="sm">
                <Bike className={classes.greenIcon} size={28} />
                <div>
                  <Text className={classes.metric}>12</Text>
                  <Text className={classes.metricLabel}>
                    bicicletas disponibles
                  </Text>
                </div>
              </Group>
              <Group gap="sm">
                <ParkingCircle className={classes.blueIcon} size={28} />
                <div>
                  <Text className={classes.metric}>8</Text>
                  <Text className={classes.metricLabel}>
                    espacios disponibles
                  </Text>
                </div>
              </Group>
              <Group gap="xs">
                <MapPin size={16} />
                <Text className={classes.distance}>A 320 metros</Text>
              </Group>
              <Group gap="xs">
                <Clock size={16} />
                <Text className={classes.distance}>Disponible ahora</Text>
              </Group>
            </Stack>

            <SimpleGrid cols={1} spacing="xs">
              <button className={classes.primaryAction}>Como llegar</button>
              <button className={classes.secondaryAction}>
                Reservar bicicleta
              </button>
            </SimpleGrid>
          </Paper>

          <Paper className={classes.nearbyCard} radius="md" p="md">
            <Title className={classes.cardTitle} order={2}>
              Estaciones cercanas
            </Title>
            <Stack gap="sm" mt="sm">
              <NearbyStation
                icon={<Bike size={18} />}
                name="Plaza Central"
                detail="6 disponibles"
                distance="400 m"
              />
              <NearbyStation
                icon={<Bike size={18} />}
                name="Parque Chacabuco"
                detail="10 disponibles"
                distance="550 m"
              />
            </Stack>
          </Paper>
        </Stack>
      </section>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {mobilityAreas.map((area) => {
          const Icon = area.icon;

          return (
            <Paper key={area.label} className={classes.areaCard} radius="md" p="md">
              <Group gap="sm" wrap="nowrap">
                <div className={classes.areaIcon}>
                  <Icon size={20} />
                </div>
                <div>
                  <Text className={classes.areaTitle}>{area.label}</Text>
                  <Text className={classes.areaValue}>{area.value}</Text>
                </div>
              </Group>
            </Paper>
          );
        })}
      </SimpleGrid>
    </Stack>
  );
}

type NearbyStationProps = {
  detail: string;
  distance: string;
  icon: ReactNode;
  name: string;
};

function NearbyStation({ detail, distance, icon, name }: NearbyStationProps) {
  return (
    <Group className={classes.nearbyItem} justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap">
        <div className={classes.nearbyIcon}>{icon}</div>
        <div>
          <Text className={classes.nearbyName}>{name}</Text>
          <Text className={classes.nearbyDetail}>{detail}</Text>
        </div>
      </Group>
      <Text className={classes.nearbyDistance}>{distance}</Text>
    </Group>
  );
}
