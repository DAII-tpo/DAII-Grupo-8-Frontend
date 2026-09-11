import { Stack, Title } from '@mantine/core';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { StationsMap } from '../../components/mobility/StationsMap';

export function MapPage() {
  return (
    <Stack gap="md">
      <Title order={1}>Mapa</Title>
      <MobilityNavigation />
      <StationsMap showHeading={false} />
    </Stack>
  );
}
