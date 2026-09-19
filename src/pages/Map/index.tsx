import { Badge, Stack } from '@mantine/core';
import { CircleCheck } from 'lucide-react';

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
      <StationsMap showHeading={false} />
    </Stack>
  );
}
