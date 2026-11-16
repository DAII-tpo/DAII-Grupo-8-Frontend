import { Alert, Badge, Button, Collapse, Group, Stack, Text } from '@mantine/core';
import { CalendarClock, ChevronDown, ChevronUp } from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';

import { climateService } from '../../../services/climate/climateService';
import type { ClimateAlert } from '../../../types/climateAlert';
import {
  actionColor,
  actionLabel,
  climateColor,
  climateDescription,
  compareClimateAlerts,
  formatClimateDate,
  phenomenonLabel,
  phenomenonVisual,
  severityLabel,
} from '../climateCopy';

import classes from './ClimateAlertBanner.module.css';

const VISIBLE_ALERTS = 2;

export function ClimateAlertBanner() {
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadAlerts = () => {
      climateService.getCurrent()
        .then((current) => { if (mounted) setAlerts([...current].sort(compareClimateAlerts)); })
        .catch(() => { /* El aviso no bloquea la navegación si falla la consulta. */ });
    };
    loadAlerts();
    const timer = window.setInterval(loadAlerts, 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  if (alerts.length === 0) return null;

  const visible = alerts.slice(0, VISIBLE_ALERTS);
  const hidden = alerts.slice(VISIBLE_ALERTS);

  return <Stack gap="xs" mb="md">
    {visible.map((alert) => <ClimateAlertCard alert={alert} key={alert.alertaId} />)}
    {hidden.length > 0 ? <>
      <Collapse expanded={expanded}>
        <Stack gap="xs">
          {hidden.map((alert) => <ClimateAlertCard alert={alert} key={alert.alertaId} />)}
        </Stack>
      </Collapse>
      <Button
        className={classes.toggle}
        leftSection={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        onClick={() => setExpanded((current) => !current)}
        size="xs"
        variant="subtle"
      >
        {expanded ? 'Ver menos alertas' : `Ver ${hidden.length} ${hidden.length === 1 ? 'alerta más' : 'alertas más'}`}
      </Button>
    </> : null}
  </Stack>;
}

function ClimateAlertCard({ alert }: Readonly<{ alert: ClimateAlert }>) {
  const { Icon, accent } = phenomenonVisual(alert.fenomeno);
  return <Alert
    classNames={{ root: classes.card, icon: classes.icon, title: classes.title, body: classes.body }}
    color={climateColor(alert)}
    icon={<span className={classes.chip}><Icon aria-hidden="true" size={20} strokeWidth={2.2} /></span>}
    style={{ '--climate-accent': accent } as CSSProperties}
    title={<Group className={classes.heading} gap="xs" justify="space-between" wrap="wrap">
      <span>{phenomenonLabel(alert.fenomeno)} · nivel {severityLabel(alert.nivelCriticidad)}</span>
      <Group gap={6} wrap="wrap">
        {alert.activa ? null : <Badge color="blue" leftSection={<CalendarClock size={12} />} size="sm" variant="light">Programada</Badge>}
        <Badge color={actionColor(alert.accion)} size="sm" variant={alert.bloqueaAlquiler ? 'filled' : 'light'}>{actionLabel(alert.accion)}</Badge>
      </Group>
    </Group>}
    variant="light"
  >
    <Text size="sm">{climateDescription(alert)}</Text>
    <Text c="dimmed" mt={4} size="xs">
      Vigencia: {formatClimateDate(alert.vigenciaDesde)} – {formatClimateDate(alert.vigenciaHasta)} (estimada)
    </Text>
  </Alert>;
}
