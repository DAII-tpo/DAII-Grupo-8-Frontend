import { Alert, Box, Button, Paper, Stack, Text } from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { analyticsService } from '../../services/analytics/analyticsService';
import pageClasses from '../../styles/mobilityPage.module.css';
export function MobilityAnalyticsPage() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadDashboard = useCallback(async () => {
    setLoading(true); setError(null);
    try { setHtml(await analyticsService.getEmbed()); }
    catch (cause) {
      setHtml(null);
      setError(axios.isAxiosError(cause) && cause.response?.status === 403
        ? 'Tu usuario no tiene permiso para consultar este tablero.'
        : 'No se pudo cargar Analítica. Intentá nuevamente.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadDashboard(); }, [loadDashboard]);
  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader title="Analítica" subtitle="Tableros e indicadores del módulo de BI." />
      <MobilityNavigation />
      {loading && <Alert title="Cargando Analítica">Estamos consultando el tablero.</Alert>}
      {error && <Alert color="red" title="No se pudo cargar el tablero"><Stack gap="sm"><Text size="sm">{error}</Text><Button size="compact-sm" variant="light" onClick={() => void loadDashboard()}>Reintentar</Button></Stack></Alert>}
      {!loading && html && <Paper withBorder p="md" radius="md"><Box component="iframe" title="Dashboard de Analítica de Movilidad" srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" w="100%" h="720px" style={{ border: 0, backgroundColor: 'transparent' }} /></Paper>}
    </Stack>
  );
}