import { Badge, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';
import { Bike, ClipboardList, History, MapPin, ParkingCircle, Route, Settings } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink } from 'react-router-dom';

import { StationsMap } from '../../components/mobility/StationsMap';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './Mobility.module.css';

type MobilityArea = {
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  path?: string;
  value: string;
};

const mobilityAreas: MobilityArea[] = [
  { icon: MapPin, label: 'Mapa', path: '/movilidad/mapa', value: 'Ver mapa' },
  { icon: Bike, label: 'Bicicletas y viajes', path: '/movilidad/bicicletas', value: 'Consultar o iniciar' },
  { icon: ParkingCircle, label: 'Estaciones', path: '/movilidad/estaciones', value: 'Ver directorio' },
  { icon: Route, label: 'Viaje activo', path: '/movilidad/bicicletas', value: 'Consultar estado' },
  { icon: History, label: 'Historial', value: 'Preparado' },
  { icon: ClipboardList, label: 'Reportes', value: 'Preparado' },
  { icon: Settings, label: 'Administracion', value: 'Preparado' },
];

export function MobilityPage() {
  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Mi movilidad"
        subtitle="Mapa, estaciones, bicicletas y viajes en un solo lugar."
        action={<Badge className={classes.statusBadge}>Mapa en tiempo real</Badge>}
      />

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
