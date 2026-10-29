import { Alert, Anchor, Box, Group, Paper, Select, Stack, Text } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';

import { MobilityNavigation } from '../../components/mobility/MobilityNavigation';
import { MobilityPageHeader } from '../../components/mobility/MobilityPageHeader';
import { env } from '../../config/env';
import { parseAnalyticsDashboardConfig } from '../../features/analytics/dashboardConfig';
import pageClasses from '../../styles/mobilityPage.module.css';

const catalog = parseAnalyticsDashboardConfig(
  env.analyticsEmbedUrl,
  env.analyticsDashboards,
  import.meta.env.DEV,
);

/** BI hosts the dashboards; Movilidad provides an authenticated, reusable viewport. */
export function MobilityAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get('dashboard');
  const selected = catalog.dashboards.find((item) => item.id === requestedId)
    ?? catalog.dashboards[0];

  const onSelect = (id: string | null) => {
    if (!id) return;
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('dashboard', id);
      return next;
    });
  };

  return (
    <Stack className={pageClasses.page} gap="lg">
      <MobilityPageHeader
        title="Analítica"
        subtitle="Tableros e indicadores del módulo de BI integrados en Movilidad."
      />
      <MobilityNavigation />

      {catalog.errors.length > 0 && (
        <Alert color="orange" title="Configuración de Analítica">
          {catalog.errors.map((error) => (
            <Text key={error} size="sm">{error}</Text>
          ))}
        </Alert>
      )}

      {!selected ? (
        <Alert color="blue" title="Esperando los dashboards de BI">
          La sección de Analítica ya está integrada en Movilidad. Cuando BI entregue
          sus URL HTTPS, configurá VITE_ANALYTICS_EMBED_URL para un tablero general
          o VITE_ANALYTICS_DASHBOARDS para varios casos de uso.
          No se muestran estadísticas ficticias.
        </Alert>
      ) : (
        <Stack gap="md">
          {catalog.dashboards.length > 1 && (
            <Select
              label="Seleccionar dashboard"
              description="Elegí la vista general o un caso de uso."
              data={catalog.dashboards.map(({ id, title }) => ({ value: id, label: title }))}
              value={selected.id}
              onChange={onSelect}
              searchable
              allowDeselect={false}
              maxDropdownHeight={280}
            />
          )}

          <Paper withBorder p="md" radius="md">
            <Stack gap="sm">
              <Group justify="space-between" align="start" gap="md">
                <div>
                  <Text fw={700}>{selected.title}</Text>
                  {selected.description && (
                    <Text c="dimmed" size="sm">{selected.description}</Text>
                  )}
                </div>
                <Anchor href={selected.url} target="_blank" rel="noopener noreferrer">
                  Abrir en otra pestaña
                </Anchor>
              </Group>

              <Box
                component="iframe"
                key={selected.id}
                src={selected.url}
                title={`Dashboard BI: ${selected.title}`}
                w="100%"
                h="720px"
                style={{ border: 0, backgroundColor: 'transparent' }}
                referrerPolicy="no-referrer"
                loading="lazy"
              />
              <Text size="xs" c="dimmed">
                Si el tablero no aparece, abrilo en otra pestaña. BI debe permitir
                la visualización embebida desde el dominio de Movilidad.
              </Text>
            </Stack>
          </Paper>
        </Stack>
      )}
    </Stack>
  );
}
