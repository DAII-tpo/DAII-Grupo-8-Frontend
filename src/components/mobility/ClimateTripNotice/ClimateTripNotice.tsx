import { Alert, Text } from '@mantine/core';
import { CloudLightning } from 'lucide-react';
import { useEffect, useState } from 'react';

import { climateService } from '../../../services/climate/climateService';
import type { ClimateTripNotification } from '../../../types/climateAlert';

export function ClimateTripNotice({ tripId }: Readonly<{ tripId: number }>) {
  const [notice, setNotice] = useState<ClimateTripNotification | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadNotice = () => {
      climateService.getTripNotifications()
        .then((notifications) => {
          if (mounted) setNotice(notifications.find((item) => item.tripId === tripId) ?? null);
        })
        .catch(() => { /* La devolución del viaje debe permanecer disponible. */ });
    };
    loadNotice();
    const timer = window.setInterval(loadNotice, 30_000);
    return () => { mounted = false; window.clearInterval(timer); };
  }, [tripId]);

  if (!notice) return null;

  return <Alert color="red" icon={<CloudLightning size={18} />} title="Alerta climática crítica durante tu viaje">
    <Text size="sm">La alerta {notice.alerta.fenomeno.replaceAll('_', ' ').toLowerCase()} afecta tu estación de origen.
      Podés devolver la bicicleta igualmente.</Text>
    {notice.suggestedStationName
      ? <Text size="sm">Estación sugerida para devolverla: {notice.suggestedStationName}.</Text>
      : null}
  </Alert>;
}
