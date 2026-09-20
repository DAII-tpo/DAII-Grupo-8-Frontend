import { Badge, Stack } from '@mantine/core';
import { CircleCheck, MapPinned } from 'lucide-react';

import { MobilityFeatureBanner } from '../../components/mobility/MobilityFeatureBanner';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { StationsMap } from '../../components/mobility/StationsMap';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import pageClasses from '../../styles/mobilityPage.module.css';

import classes from './Map.module.css';

export function MapPage() {
  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Mapa de estaciones"
        subtitle="Consultá ubicaciones y disponibilidad de bicicletas en tiempo real."
        action={<Badge
          className={classes.statusBadge}
          leftSection={<CircleCheck size={15} />}
          radius="xl"
          size="lg"
          variant="light"
        >
          Sistema operativo
        </Badge>}
      />
      <MobilityNavigation />
      <MobilityFeatureBanner
        description="Desplazate, acercá el mapa y seleccioná cualquier marcador para consultar bicicletas y espacios."
        icon={MapPinned}
        label="Red de estaciones"
        title="Explorá la ciudad sin perder de vista la disponibilidad"
        tone="blue"
      />
      <StationsMap showHeading={false} />
    </Stack>
  );
}
