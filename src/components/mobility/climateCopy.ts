import {
  CloudAlert,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudRainWind,
  Snowflake,
  ThermometerSnowflake,
  ThermometerSun,
  Tornado,
  Wind,
  type LucideIcon,
} from 'lucide-react';

import type { ClimateAction, ClimateAlert, ClimateSeverity } from '../../types/climateAlert';

/**
 * Textos e identidad visual de las alertas climáticas. Todo lo que dice "qué se puede hacer" sale de
 * {@code accion} (la respuesta de la matriz fenómeno × criticidad del backend), nunca del nivel.
 */

type PhenomenonInfo = Readonly<{
  label: string;
  /** Mismo texto que {@code ClimatePhenomenon.riskHint()} en el backend. */
  riskHint: string;
  Icon: LucideIcon;
  accent: string;
}>;

const PHENOMENA: Readonly<Record<string, PhenomenonInfo>> = {
  TORMENTA_ELECTRICA: { label: 'Tormenta eléctrica', riskHint: 'riesgo de rayos', Icon: CloudLightning, accent: '#7048e8' },
  HURACAN: { label: 'Huracán', riskHint: 'vientos extremos', Icon: Tornado, accent: '#3b2f8f' },
  NIEVE: { label: 'Nieve', riskHint: 'calzada con nieve o hielo', Icon: Snowflake, accent: '#1c7ed6' },
  GRANIZO: { label: 'Granizo', riskHint: 'caída de granizo', Icon: CloudHail, accent: '#0c8599' },
  TORMENTA_FUERTE: { label: 'Tormenta fuerte', riskHint: 'tormenta fuerte', Icon: CloudRainWind, accent: '#364fc7' },
  VIENTO_FUERTE: { label: 'Viento fuerte', riskHint: 'ráfagas de viento', Icon: Wind, accent: '#087f5b' },
  LLUVIA_INTENSA: { label: 'Lluvia intensa', riskHint: 'calzada resbaladiza', Icon: CloudRain, accent: '#1971c2' },
  OLA_DE_CALOR: { label: 'Ola de calor', riskHint: 'calor extremo', Icon: ThermometerSun, accent: '#e8590c' },
  OLA_DE_FRIO: { label: 'Ola de frío', riskHint: 'frío extremo', Icon: ThermometerSnowflake, accent: '#4dabf7' },
};

const UNKNOWN_VISUAL = { Icon: CloudAlert, accent: '#495057' } as const;

const ACTION_RANK: Readonly<Record<ClimateAction, number>> = {
  AVISO: 0,
  CONFIRMACION: 1,
  BLOQUEO: 2,
  BLOQUEO_Y_AVISO_VIAJES: 3,
};

const SEVERITY_RANK: Readonly<Record<ClimateSeverity, number>> = { BAJA: 0, MEDIA: 1, ALTA: 2, CRITICA: 3 };

const SEVERITY_LABEL: Readonly<Record<ClimateSeverity, string>> = {
  BAJA: 'baja',
  MEDIA: 'media',
  ALTA: 'alta',
  CRITICA: 'crítica',
};

export type ClimateTone = 'blocked' | 'confirm' | 'notice';

/** Colores de la acción para lo que no es Mantine (círculos de Leaflet, marcadores). */
export const CLIMATE_TONE_COLOR: Readonly<Record<ClimateTone, string>> = {
  blocked: '#c8544d',
  confirm: '#e8590c',
  notice: '#d99838',
};

function phenomenonInfo(fenomeno: string): PhenomenonInfo | undefined {
  return PHENOMENA[fenomeno.trim().toUpperCase()];
}

/** Nombre legible del fenómeno ("Tormenta eléctrica"); para fenómenos nuevos, el código sin guiones bajos. */
export function phenomenonLabel(fenomeno: string): string {
  const known = phenomenonInfo(fenomeno);
  if (known) return known.label;
  const text = fenomeno.trim().replaceAll('_', ' ').toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : 'Fenómeno climático';
}

/** Riesgo corto del fenómeno ("riesgo de rayos"), o null si el fenómeno no es conocido. */
export function phenomenonRiskHint(fenomeno: string): string | null {
  return phenomenonInfo(fenomeno)?.riskHint ?? null;
}

export function phenomenonVisual(fenomeno: string): Readonly<{ Icon: LucideIcon; accent: string }> {
  const known = phenomenonInfo(fenomeno);
  return known ? { Icon: known.Icon, accent: known.accent } : UNKNOWN_VISUAL;
}

export function severityLabel(nivel: ClimateSeverity): string {
  return SEVERITY_LABEL[nivel] ?? String(nivel).toLowerCase();
}

export function blocksRental(alert: Pick<ClimateAlert, 'accion' | 'bloqueaAlquiler'>): boolean {
  return alert.bloqueaAlquiler || alert.accion === 'BLOQUEO' || alert.accion === 'BLOQUEO_Y_AVISO_VIAJES';
}

export function climateTone(alert: Pick<ClimateAlert, 'accion' | 'bloqueaAlquiler'>): ClimateTone {
  if (blocksRental(alert)) return 'blocked';
  return alert.accion === 'CONFIRMACION' ? 'confirm' : 'notice';
}

/** Color Mantine de la alerta: rojo si bloquea el alquiler; si no, naranja. */
export function climateColor(alert: Pick<ClimateAlert, 'accion' | 'bloqueaAlquiler'>): 'red' | 'orange' {
  return blocksRental(alert) ? 'red' : 'orange';
}

export function actionLabel(accion: ClimateAction): string {
  switch (accion) {
    case 'BLOQUEO_Y_AVISO_VIAJES': return 'Alquiler bloqueado · aviso a viajes';
    case 'BLOQUEO': return 'Alquiler bloqueado';
    case 'CONFIRMACION': return 'Requiere confirmación';
    default: return 'Aviso';
  }
}

export function actionColor(accion: ClimateAction): 'red' | 'orange' | 'gray' {
  if (accion === 'BLOQUEO' || accion === 'BLOQUEO_Y_AVISO_VIAJES') return 'red';
  return accion === 'CONFIRMACION' ? 'orange' : 'gray';
}

/** Vigentes antes que programadas; dentro de cada grupo, la más restrictiva primero y después mayor nivel. */
export function compareClimateAlerts(left: ClimateAlert, right: ClimateAlert): number {
  return Number(right.activa) - Number(left.activa)
    || (ACTION_RANK[right.accion] ?? 0) - (ACTION_RANK[left.accion] ?? 0)
    || (SEVERITY_RANK[right.nivelCriticidad] ?? 0) - (SEVERITY_RANK[left.nivelCriticidad] ?? 0)
    || left.vigenciaDesde.localeCompare(right.vigenciaDesde);
}

export function formatClimateDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'America/Argentina/Buenos_Aires',
  });
}

export function neighborhoodsText(barrios: string[]): string {
  if (barrios.length === 0) return '';
  if (barrios.length === 1) return barrios[0];
  return `${barrios.slice(0, -1).join(', ')} y ${barrios.at(-1)}`;
}

function inScope(barrios: string[]) {
  return barrios.length > 0 ? `en ${neighborhoodsText(barrios)}` : 'en el área afectada';
}

function stationsScope(barrios: string[]) {
  return barrios.length > 0 ? `estaciones de ${neighborhoodsText(barrios)}` : 'estaciones del área afectada';
}

function hintSuffix(fenomeno: string) {
  const hint = phenomenonRiskHint(fenomeno);
  return hint ? ` (${hint})` : '';
}

/** Texto principal de la alerta, según la acción efectiva y si ya está vigente. */
export function climateDescription(alert: ClimateAlert): string {
  const hint = hintSuffix(alert.fenomeno);
  const blocked = blocksRental(alert);

  if (!alert.activa) {
    const since = `Desde el ${formatClimateDate(alert.vigenciaDesde)}`;
    if (blocked) {
      return `${since} no se podrán iniciar viajes desde ${stationsScope(alert.barrios)}${hint}. Las devoluciones seguirán permitidas.`;
    }
    if (alert.accion === 'CONFIRMACION') {
      return `${since}, para retirar una bicicleta ${inScope(alert.barrios)} vas a tener que aceptar el riesgo climático${hint}.`;
    }
    return `${since} rige un aviso climático ${inScope(alert.barrios)}${hint}.`;
  }

  if (blocked) {
    const base = `No se pueden iniciar viajes desde ${stationsScope(alert.barrios)}${hint}. Las devoluciones siguen permitidas.`;
    return alert.accion === 'BLOQUEO_Y_AVISO_VIAJES'
      ? `${base} Si estás en viaje, te sugerimos dónde devolver la bicicleta.`
      : base;
  }
  if (alert.accion === 'CONFIRMACION') {
    return `Para retirar una bicicleta ${inScope(alert.barrios)} vas a tener que aceptar el riesgo climático${hint}.`;
  }
  return `Circulá con precaución ${inScope(alert.barrios)}${hint}.`;
}

/** Frase corta para una estación puntual (detalle en el mapa, selector de origen). */
export function stationClimateNotice(alert: Pick<ClimateAlert, 'accion' | 'bloqueaAlquiler'>): string {
  if (blocksRental(alert)) return 'No se pueden iniciar viajes desde esta estación.';
  if (alert.accion === 'CONFIRMACION') return 'Para retirar una bicicleta vas a tener que aceptar el riesgo climático.';
  return 'Circulá con precaución.';
}

/** Sufijo para la opción de la estación en el selector de origen. */
export function stationOptionSuffix(alert: Pick<ClimateAlert, 'accion' | 'bloqueaAlquiler'>): string {
  if (blocksRental(alert)) return ' · bloqueada por clima';
  return alert.accion === 'CONFIRMACION' ? ' · requiere aceptar riesgo climático' : ' · aviso climático';
}
