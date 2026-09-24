import { Alert, Badge, Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
import { AlertTriangle, Bike, ChartNoAxesCombined, Clock3 } from 'lucide-react';

import {
  mockAvailabilityPredictions,
  mockBikeMetrics,
  mockBikesByStation,
  mockDemandRanking,
  mockHourlyTrips,
  mockOperationalAlerts,
  mockStationOccupancy,
} from './analyticsMockData';
import classes from './Administration.module.css';

type AnalyticsTone = 'amber' | 'blue' | 'green' | 'red' | 'sky';

export function AnalyticsDashboard() {
  return (
    <Stack gap="lg">
      <Alert color="blue" icon={<ChartNoAxesCombined size={18} />} title="Datos demostrativos">
        Este panel será alimentado por la integración con BI.
      </Alert>

      <section aria-labelledby="analytics-bikes-title">
        <Title className={classes.analyticsSectionTitle} id="analytics-bikes-title" order={2}>Indicadores de bicicletas</Title>
        <SimpleGrid cols={{ base: 1, xs: 2, lg: 5 }} mt="sm" spacing="md">
          {mockBikeMetrics.map((metric) => <AnalyticsMetric key={metric.label} label={metric.label} tone={metric.tone} value={metric.value} />)}
        </SimpleGrid>
      </section>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
        <StationBarChart />
        <StationOccupancy />
        <HourlyTripsChart />
        <DemandRanking />
        <AvailabilityPrediction />
        <OperationalAlerts />
      </SimpleGrid>
    </Stack>
  );
}

function AnalyticsMetric({ label, tone, value }: Readonly<{ label: string; tone: AnalyticsTone; value: number }>) {
  const toneClass = analyticsToneClass(tone);

  return (
    <Paper className={`${classes.analyticsMetric} ${toneClass}`} p="md" radius="md">
      <Text className={classes.analyticsMetricLabel}>{label}</Text>
      <Text className={classes.analyticsMetricValue}>{value}</Text>
      <Text c="dimmed" size="xs">Dato mock</Text>
    </Paper>
  );
}

function StationBarChart() {
  const maxValue = Math.max(...mockBikesByStation.map((item) => item.value));

  return (
    <AnalyticsPanel description="Cantidad mock de bicicletas registradas por estación." title="Bicicletas por estación">
      <Stack className={classes.analyticsBars} gap="sm">
        {mockBikesByStation.map((item) => <BarRow key={item.station} label={item.station} value={item.value} percentage={percentage(item.value, maxValue)} />)}
      </Stack>
    </AnalyticsPanel>
  );
}

function StationOccupancy() {
  return (
    <AnalyticsPanel description="Anclajes ocupados y libres en estaciones demostrativas." title="Ocupación por estación">
      <Stack gap="md">
        {mockStationOccupancy.map((station) => {
          const total = station.occupied + station.available;
          const occupiedPercentage = percentage(station.occupied, total);
          return <div key={station.station}><Group justify="space-between"><Text fw={700} size="sm">{station.station}</Text><Text c="dimmed" size="xs">{station.occupied} ocupados · {station.available} libres</Text></Group><Progress aria-label={`Ocupación mock de ${station.station}`} color="citypassUrbanBlue" mt={6} value={occupiedPercentage} /></div>;
        })}
      </Stack>
    </AnalyticsPanel>
  );
}

function HourlyTripsChart() {
  const maxValue = Math.max(...mockHourlyTrips.map((item) => Math.max(item.started, item.completed)));

  return (
    <AnalyticsPanel description="Viajes iniciados y finalizados por franja horaria." title="Viajes por hora">
      <div aria-label="Gráfico mock de viajes por hora" className={classes.hourlyChart}>
        {mockHourlyTrips.map((item) => <div className={classes.hourlyColumn} key={item.hour}><div className={classes.hourlyBars}><span aria-label={`${item.hour}: ${item.started} iniciados`} className={classes.hourlyStarted} style={{ height: `${percentage(item.started, maxValue)}%` }} /><span aria-label={`${item.hour}: ${item.completed} finalizados`} className={classes.hourlyCompleted} style={{ height: `${percentage(item.completed, maxValue)}%` }} /></div><Text className={classes.hourlyLabel} size="xs">{item.hour}</Text></div>)}
      </div>
      <Group gap="md" mt="sm"><Legend colorClass={classes.hourlyStartedLegend} label="Iniciados" /><Legend colorClass={classes.hourlyCompletedLegend} label="Finalizados" /></Group>
    </AnalyticsPanel>
  );
}

function DemandRanking() {
  return (
    <AnalyticsPanel description="Ranking mock de demanda acumulada por estación." title="Estaciones con mayor demanda">
      <Stack gap="xs">
        {mockDemandRanking.map((station, index) => <Group className={classes.rankingRow} justify="space-between" key={station}><Group gap="sm"><Badge circle color="citypassUrbanBlue" variant="filled">{index + 1}</Badge><Text fw={700}>{station}</Text></Group><Text c="dimmed" size="sm">Demanda alta</Text></Group>)}
      </Stack>
    </AnalyticsPanel>
  );
}

function AvailabilityPrediction() {
  return (
    <AnalyticsPanel description="Simulación mock hasta integrar BI." title="Predicción de disponibilidad">
      <Stack gap="md">
        <Group gap="xs"><Clock3 size={18} /><Text fw={700} size="sm">Simulación de próximas horas</Text></Group>
        {mockAvailabilityPredictions.map((prediction) => <div key={prediction.hour}><Group justify="space-between"><Text size="sm">{prediction.hour}</Text><Text c="dimmed" size="xs">{prediction.percentage}% disponible</Text></Group><Progress aria-label={`Predicción mock para ${prediction.hour}`} color="citypassUrbanGreen" mt={6} value={prediction.percentage} /></div>)}
      </Stack>
    </AnalyticsPanel>
  );
}

function OperationalAlerts() {
  return (
    <AnalyticsPanel description="Ejemplos de alertas que podrá entregar BI." title="Alertas operativas">
      <Stack gap="sm">
        {mockOperationalAlerts.map((message) => <Alert color="orange" icon={<AlertTriangle size={17} />} key={message} variant="light">{message}</Alert>)}
      </Stack>
    </AnalyticsPanel>
  );
}

function AnalyticsPanel({ children, description, title }: Readonly<{ children: ReactNode; description: string; title: string }>) {
  return (
    <Paper aria-label={title} className={classes.analyticsPanel} p="lg" radius="md">
      <Group justify="space-between" wrap="wrap"><div><Title className={classes.chartTitle} order={2}>{title}</Title><Text c="dimmed" size="sm">{description}</Text></div><Bike className={classes.analyticsPanelIcon} size={21} /></Group>
      <div className={classes.analyticsContent}>{children}</div>
    </Paper>
  );
}

function BarRow({ label, percentage: barPercentage, value }: Readonly<{ label: string; percentage: number; value: number }>) {
  return <div className={classes.analyticsBarRow}><Text className={classes.barLabel}>{label}</Text><div className={classes.barTrack}><div className={classes.analyticsBarFill} style={{ width: `${barPercentage}%` }} /></div><Text className={classes.barValue}>{value}</Text></div>;
}

function Legend({ colorClass, label }: Readonly<{ colorClass: string; label: string }>) {
  return <Group gap={6}><span aria-hidden="true" className={`${classes.legendDot} ${colorClass}`} /><Text c="dimmed" size="xs">{label}</Text></Group>;
}

function analyticsToneClass(tone: AnalyticsTone) {
  const toneClasses: Record<AnalyticsTone, string> = {
    amber: classes.toneAmber,
    blue: classes.toneBlue,
    green: classes.toneGreen,
    red: classes.toneRed,
    sky: classes.toneSky,
  };
  return toneClasses[tone];
}

function percentage(value: number, total: number) {
  return Math.round(value / total * 100);
}
