import { Alert, Anchor, Box, Paper, Stack, Text, Title } from '@mantine/core';
import { env } from '../../config/env';

/**
 * BI owns the analytics HTML. Movilidad only embeds its read-only dashboard.
 * The URL and authentication/embedding policy must be agreed with BI.
 */
export function MobilityAnalyticsPage() {
  const url = env.analyticsEmbedUrl.trim();
  const parsed = (() => {
    try {
      const value = new URL(url);
      return value.protocol === 'https:' || (import.meta.env.DEV && value.protocol === 'http:') ? value : null;
    } catch {
      return null;
    }
  })();

  return (
    <Stack gap="md">
      <Title order={2}>Analítica de Movilidad</Title>
      <Text c="dimmed">Indicadores procesados por el módulo de Analítica a partir de eventos EDA.</Text>
      {!url ? (
        <Alert color="blue" title="Integración pendiente de BI">
          El acceso ya está preparado. Falta que Analítica confirme la URL del HTML embebible y
          habilitar VITE_ANALYTICS_EMBED_URL en el despliegue.
        </Alert>
      ) : !parsed ? (
        <Alert color="red" title="URL de Analítica inválida">
          Configurá una URL HTTPS válida en VITE_ANALYTICS_EMBED_URL.
        </Alert>
      ) : (
        <Paper withBorder p="sm">
          <Stack gap="xs">
            <Anchor href={parsed.href} target="_blank" rel="noopener noreferrer">Abrir Analítica en otra pestaña</Anchor>
            <Box
              component="iframe"
              src={parsed.href}
              title="Panel de Analítica de Movilidad"
              w="100%"
              h="720px"
              style={{ border: 0 }}
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
