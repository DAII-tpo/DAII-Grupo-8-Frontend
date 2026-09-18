import { Badge, Group, Stack, Text, Title } from '@mantine/core';
import { CircleCheck } from 'lucide-react';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { StationsMap } from '../../components/mobility/StationsMap';

import classes from './Map.module.css';

export function MapPage() {
  return (
    <Stack className={classes.page} gap="lg">
      <Group align="flex-end" justify="space-between" gap="md">
        <div>
          <Text className={classes.eyebrow}>Movilidad urbana</Text>
          <Title className={classes.title} order={1}>Mapa de estaciones</Title>
          <Text className={classes.subtitle}>
            Consultá ubicaciones y disponibilidad de bicicletas en tiempo real.
          </Text>
        </div>
        <Badge
          className={classes.statusBadge}
          leftSection={<CircleCheck size={15} />}
          radius="xl"
          size="lg"
          variant="light"
        >
          Sistema operativo
        </Badge>
      </Group>
      <MobilityNavigation />
      <StationsMap showHeading={false} />
    </Stack>
  );
}
