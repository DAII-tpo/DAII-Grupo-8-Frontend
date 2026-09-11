import { Badge, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { Bike, ClipboardList, History, MapPin, ParkingCircle, Route, Settings } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';

import { StationsMap } from '../../components/mobility/StationsMap';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';

import classes from './Mobility.module.css';

type MobilityArea = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  path?: string;
  value: string;
};

const mobilityAreas: MobilityArea[] = [
  { icon: MapPin, label: 'Mapa', path: '/movilidad/mapa', value: 'Ver mapa' },
  { icon: Bike, label: 'Bicicletas', value: 'Preparado' },
  { icon: ParkingCircle, label: 'Estaciones', path: '/movilidad/estaciones', value: 'Ver directorio' },
  { icon: Route, label: 'Viaje activo', value: 'Sin viaje iniciado' },
  { icon: History, label: 'Historial', value: 'Preparado' },
  { icon: ClipboardList, label: 'Reportes', value: 'Preparado' },
  { icon: Settings, label: 'Administracion', value: 'Preparado' },
];

export function MobilityPage() {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Title className={classes.title} order={1}>Movilidad Urbana</Title>
          <Text className={classes.subtitle}>Mapa, estaciones, bicicletas, viajes y gestión del módulo.</Text>
        </Stack>
        <Badge className={classes.statusBadge}>Mapa en tiempo real</Badge>
      </Group>

      <MobilityNavigation />

      <StationsMap showHeading={false} />

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="sm">
        {mobilityAreas.map((area) => <MobilityAreaCard key={area.label} area={area} />)}
      </SimpleGrid>
    </Stack>
  );
}

type MobilityAreaCardProps = {
  area: MobilityArea;
};

function MobilityAreaCard({ area }: MobilityAreaCardProps) {
  const Icon = area.icon;
  const content = (
    <Paper className={classes.areaCard} radius="md" p="md">
      <Group gap="sm" wrap="nowrap">
        <div className={classes.areaIcon}><Icon size={20} /></div>
        <div>
          <Text className={classes.areaTitle}>{area.label}</Text>
          <Text className={classes.areaValue}>{area.value}</Text>
        </div>
      </Group>
    </Paper>
  );

  if (!area.path) {
    return content;
  }

  return (
    <NavLink to={area.path} className={({ isActive }) => `${classes.areaCardLink} ${isActive ? classes.areaCardActive : ''}`}>
      {content}
    </NavLink>
  );
}
