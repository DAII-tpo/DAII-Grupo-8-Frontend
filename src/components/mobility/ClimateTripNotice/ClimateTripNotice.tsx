import { Alert, Stack, Text } from '@mantine/core';
import { useEffect, useState, type CSSProperties } from 'react';

import { climateService } from '../../../services/climate/climateService';
import type { ClimateTripNotification } from '../../../types/climateAlert';
import { formatClimateDate, phenomenonLabel, phenomenonRiskHint, phenomenonVisual } from '../climateCopy';

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

  const { alerta } = notice;
  const { Icon, accent } = phenomenonVisual(alerta.fenomeno);
  const hint = phenomenonRiskHint(alerta.fenomeno);

  return <Alert
    color="red"
    icon={<Icon aria-hidden="true" size={18} />}
    style={{ borderLeft: `4px solid ${accent}` } as CSSProperties}
    title={`${phenomenonLabel(alerta.fenomeno)}: alerta durante tu viaje`}
  >
    <Stack gap={4}>
      <Text size="sm">
        La alerta afecta a tu estación de origen{hint ? ` (${hint})` : ''}. Podés devolver la bicicleta en cualquier estación.
      </Text>
      {notice.suggestedStationName
        ? <Text fw={600} size="sm">Estación sugerida para devolverla: {notice.suggestedStationName}.</Text>
        : <Text size="sm">No encontramos otra estación libre de la alerta cerca: podés devolverla igual en la más cercana.</Text>}
      <Text c="dimmed" size="xs">Vigencia estimada hasta {formatClimateDate(alerta.vigenciaHasta)}.</Text>
    </Stack>
  </Alert>;
}
