import { Alert, Box, Button, Paper, Stack, Text } from '@mantine/core';
import axios from 'axios';
import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { analyticsService } from '../../services/analytics/analyticsService';

export function MobilityAnalyticsPage() {
  return <Navigate to="/movilidad/administracion?tab=analytics" replace />;
}

export function MobilityAnalyticsEmbed() {
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
  useEffect(() => {
    let active = true;
    analyticsService.getEmbed().then((response) => { if (active) setHtml(response); })
      .catch((cause: unknown) => {
        if (!active) return;
        setHtml(null);
        setError(axios.isAxiosError(cause) && cause.response?.status === 403
          ? 'Tu usuario no tiene permiso para consultar este tablero.'
          : 'No se pudo cargar Analítica. Intentá nuevamente.');
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <Stack gap="md">
    {loading && <Alert title="Cargando Analítica">Estamos consultando el tablero.</Alert>}
    {error && <Alert color="red" title="No se pudo cargar el tablero"><Stack gap="sm"><Text size="sm">{error}</Text><Button size="compact-sm" variant="light" onClick={() => void loadDashboard()}>Reintentar</Button></Stack></Alert>}
    {!loading && html && <Paper withBorder p="md" radius="md"><Box component="iframe" title="Dashboard de Analítica de Movilidad" srcDoc={html} sandbox="allow-scripts" referrerPolicy="no-referrer" loading="lazy" w="100%" h="720px" style={{ border: 0, backgroundColor: 'transparent' }} /></Paper>}
  </Stack>;
}