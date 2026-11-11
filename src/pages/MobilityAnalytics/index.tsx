import { Alert, Box, Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

import { RequireRole } from '../../app/router/RequireRole';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { analyticsService, type AnalyticsEmbed } from '../../services/analytics/analyticsService';
import pageClasses from '../../styles/mobilityPage.module.css';

type State = AnalyticsEmbed | { status: 'loading' } | { status: 'error'; message: string };

export function MobilityAnalyticsPage() {
  return <RequireRole><AnalyticsContent /></RequireRole>;
}

function AnalyticsContent() {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State>({ status: 'loading' });
  useEffect(() => {
    const controller = new AbortController();
    analyticsService.embed(controller.signal).then((result) => {
      if (!controller.signal.aborted) setState(result);
    }).catch(() => {
      if (controller.signal.aborted) return;
      setState({ status: 'error', message: 'No se pudo consultar Analítica. Intentá nuevamente.' });
    });
    return () => controller.abort();
  }, [version]);

  const refresh = () => {
    setState({ status: 'loading' });
    setVersion((current) => current + 1);
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader title="Analítica" subtitle="Tableros e indicadores del módulo de BI integrados en Movilidad." />
      <MobilityNavigation />
      <Group justify="flex-end">
        <Button onClick={refresh} disabled={state.status === 'loading'} variant="light">Actualizar tablero</Button>
      </Group>
      {state.status === 'loading' && <Group><Loader size="sm" /><Text>Consultando Analítica…</Text></Group>}
      {state.status === 'connected' && (
        <Alert color="blue" title="Conexión con Analítica establecida">
          El tablero estará disponible cuando el equipo de BI publique el HTML.
        </Alert>
      )}
      {state.status === 'error' && <Alert color="red" title="Analítica no disponible">{state.message}</Alert>}
      {state.status === 'ready' && (
        <Paper withBorder p="md" radius="md">
          <Box component="iframe" title="Tablero de Analítica de Movilidad" srcDoc={state.html}
            sandbox="allow-scripts" referrerPolicy="no-referrer"
            allow="camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'"
            w="100%" h="720px" style={{ border: 0 }} />
        </Paper>
      )}
    </Stack>
  );
}
