export type ClimateSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

/** Respuesta que resulta de la matriz fenómeno × criticidad del backend, de menos a más restrictiva. */
export type ClimateAction = 'AVISO' | 'CONFIRMACION' | 'BLOQUEO' | 'BLOQUEO_Y_AVISO_VIAJES';

export type ClimateAlert = {
  alertaId: string;
  nivelCriticidad: ClimateSeverity;
  fenomeno: string;
  barrios: string[];
  vigenciaDesde: string;
  vigenciaHasta: string;
  activa: boolean;
  accion: ClimateAction;
  bloqueaAlquiler: boolean;
};

export type StationClimateStatus = {
  stationId: number;
  alerta: ClimateAlert | null;
};

export type ClimateTripNotification = {
  tripId: number;
  alerta: ClimateAlert;
  suggestedStationId: number | null;
  suggestedStationName: string | null;
  notifiedAt: string;
};
