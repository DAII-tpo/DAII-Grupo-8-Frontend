import { useEffect, useState } from 'react';

import { climateService } from '../../services/climate/climateService';
import type { ClimateAlert } from '../../types/climateAlert';

const REFRESH_MS = 30_000;

/**
 * Alerta climática ACTIVA que rige en cada estación (la más restrictiva del barrio, según el backend).
 * Se refresca cada 30 s; si la consulta falla se conserva el último estado, porque el clima nunca
 * debe bloquear la pantalla: el backend sigue siendo quien decide al iniciar el viaje.
 */
export function useStationClimate(): Readonly<Record<number, ClimateAlert>> {
  const [climateByStation, setClimateByStation] = useState<Record<number, ClimateAlert>>({});

  useEffect(() => {
    let mounted = true;
    const load = () => {
      climateService.getStationStatuses()
        .then((statuses) => {
          if (!mounted) return;
          const active: Record<number, ClimateAlert> = {};
          for (const status of statuses) {
            if (status.alerta?.activa) active[status.stationId] = status.alerta;
          }
          setClimateByStation(active);
        })
        .catch(() => { /* El estado climático es informativo. */ });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => { mounted = false; window.clearInterval(timer); };
  }, []);

  return climateByStation;
}
