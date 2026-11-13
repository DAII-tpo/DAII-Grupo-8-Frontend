import { Alert, Stack, Text } from '@mantine/core';
import { CloudLightning } from 'lucide-react';
import { useEffect, useState } from 'react';

import { climateService } from '../../../services/climate/climateService';
import type { ClimateAlert } from '../../../types/climateAlert';

function describeAlert(alert: ClimateAlert) {
  const scope = alert.barrios.length > 0 ? ` en ${alert.barrios.join(', ')}` : '';
  if (!alert.activa) {
    return `Desde ${new Date(alert.vigenciaDesde).toLocaleString('es-AR')} puede verse afectado el servicio${scope}.`;
  }
  if (alert.nivelCriticidad === 'ALTA' || alert.nivelCriticidad === 'CRITICA') {
    return `No se pueden iniciar viajes desde estaciones afectadas${scope}. Las devoluciones siguen permitidas.`;
  }
  if (alert.nivelCriticidad === 'MEDIA') {
    return `Antes de iniciar un viaje desde una estación afectada${scope}, deberás aceptar el riesgo climático.`;
  }
  return `Aviso climático vigente${scope}.`;
}

export function ClimateAlertBanner() {
  const [alerts, setAlerts] = useState<ClimateAlert[]>([]);

  useEffect(() => {
    let mounted = true;
    const loadAlerts = () => {
      climateService.getCurrent()
        .then((current) => { if (mounted) setAlerts(current); })
        .catch(() => { /* El aviso no bloquea la navegación si falla la consulta. */ });
    };
    loadAlerts();
    const timer = window.setInterval(loadAlerts, 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  if (alerts.length === 0) return null;

  return <Stack gap="xs" mb="md">
    {alerts.map((alert) => <Alert
      color={alert.nivelCriticidad === 'CRITICA' || alert.nivelCriticidad === 'ALTA' ? 'red' : 'orange'}
      icon={<CloudLightning size={18} />}
      key={alert.alertaId}
      title={`Alerta climática ${alert.nivelCriticidad.toLowerCase()}: ${alert.fenomeno.replaceAll('_', ' ').toLowerCase()}`}
    >
      <Text size="sm">{describeAlert(alert)} Vigencia estimada hasta {new Date(alert.vigenciaHasta).toLocaleString('es-AR')}.</Text>
    </Alert>)}
  </Stack>;
}
