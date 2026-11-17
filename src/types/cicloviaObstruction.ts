export type CicloviaObstruction = {
  id: number;
  reclamoId: string;
  ciudadanoId: string | null;
  titulo: string | null;
  descripcion: string | null;
  direccion: string | null;
  barrio: string | null;
  latitude: number;
  longitude: number;
  impactLevel: 'BAJO' | 'MEDIO' | 'ALTO' | string;
  status: 'ACTIVE' | 'RESOLVED' | string;
  affectedStationIds: number[];
  detourDescription: string | null;
  emergencyDispatched: boolean;
  createdAt: string;
  resolvedAt: string | null;
};
