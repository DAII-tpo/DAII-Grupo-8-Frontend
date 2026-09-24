// Datos temporales hasta integrar BI.

export const mockBikeMetrics = [
  { label: 'Total de bicicletas', value: 184, tone: 'blue' },
  { label: 'Disponibles', value: 112, tone: 'green' },
  { label: 'En uso', value: 38, tone: 'sky' },
  { label: 'En mantenimiento', value: 21, tone: 'amber' },
  { label: 'Fuera de servicio / robadas', value: 13, tone: 'red' },
] as const;

export const mockBikesByStation = [
  { station: 'UADE', value: 18 },
  { station: 'Constitución', value: 25 },
  { station: 'Obelisco', value: 31 },
  { station: 'Puerto Madero', value: 22 },
  { station: 'Retiro', value: 28 },
] as const;

export const mockStationOccupancy = [
  { station: 'UADE', occupied: 18, available: 12 },
  { station: 'Constitución', occupied: 25, available: 15 },
  { station: 'Obelisco', occupied: 31, available: 9 },
  { station: 'Puerto Madero', occupied: 22, available: 18 },
  { station: 'Retiro', occupied: 28, available: 12 },
] as const;

export const mockHourlyTrips = [
  { hour: '08:00', started: 14, completed: 11 },
  { hour: '10:00', started: 28, completed: 24 },
  { hour: '12:00', started: 36, completed: 31 },
  { hour: '14:00', started: 31, completed: 27 },
  { hour: '16:00', started: 42, completed: 37 },
  { hour: '18:00', started: 48, completed: 43 },
  { hour: '20:00', started: 25, completed: 22 },
] as const;

export const mockDemandRanking = ['Obelisco', 'Retiro', 'Constitución', 'UADE', 'Puerto Madero'] as const;

export const mockAvailabilityPredictions = [
  { hour: 'Próxima hora', percentage: 62 },
  { hour: '+2 horas', percentage: 54 },
  { hour: '+3 horas', percentage: 46 },
  { hour: '+4 horas', percentage: 58 },
] as const;

export const mockOperationalAlerts = [
  'UADE: riesgo de quedarse sin bicicletas',
  'Retiro: alta ocupación de anclajes',
  'Constitución: disponibilidad baja',
] as const;
