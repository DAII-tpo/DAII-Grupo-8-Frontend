export type ClimateSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export type ClimateAlert = {
  alertaId: string;
  nivelCriticidad: ClimateSeverity;
  fenomeno: string;
  barrios: string[];
  vigenciaDesde: string;
  vigenciaHasta: string;
  activa: boolean;
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
