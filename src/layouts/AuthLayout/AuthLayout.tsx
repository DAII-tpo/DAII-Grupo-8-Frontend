import { Container, Paper, Stack, Text } from '@mantine/core';
import { Outlet } from 'react-router-dom';

import { BrandLogo } from '../../components/common/BrandLogo';

import classes from './AuthLayout.module.css';

export function AuthLayout() {
  return (
    <main className={classes.authPage}>
      <Container size="xs">
        <Paper className={classes.panel} radius="md" p="xl">
          <Stack gap="xl">
            <BrandLogo />
            <Text className={classes.helper}>
              Acceso preparado para futura integracion con Login Federado.
            </Text>
            <Outlet />
          </Stack>
        </Paper>
      </Container>
    </main>
  );
}
