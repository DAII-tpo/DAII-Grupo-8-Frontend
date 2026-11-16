import { describe, expect, it } from 'vitest';

import type { ClimateAction, ClimateAlert } from '../../types/climateAlert';
import {
  actionLabel,
  climateColor,
  climateDescription,
  climateTone,
  compareClimateAlerts,
  phenomenonLabel,
  phenomenonVisual,
  stationClimateNotice,
} from './climateCopy';

const BLOCKING: ReadonlySet<ClimateAction> = new Set(['BLOQUEO', 'BLOQUEO_Y_AVISO_VIAJES']);

function alertOf(overrides: Partial<ClimateAlert> = {}): ClimateAlert {
  const accion = overrides.accion ?? 'AVISO';
  return {
    alertaId: 'weather-1',
    nivelCriticidad: 'MEDIA',
    fenomeno: 'TORMENTA_FUERTE',
    barrios: ['Palermo'],
    vigenciaDesde: '2026-11-12T10:00:00Z',
    vigenciaHasta: '2026-11-13T10:00:00Z',
    activa: true,
    bloqueaAlquiler: BLOCKING.has(accion),
    ...overrides,
    accion,
  };
}

describe('climateDescription', () => {
  it('AVISO pide precaución e incluye el riesgo del fenómeno', () => {
    expect(climateDescription(alertOf({ accion: 'AVISO', fenomeno: 'OLA_DE_FRIO' })))
      .toBe('Circulá con precaución en Palermo (frío extremo).');
  });

  it('CONFIRMACION anticipa que hay que aceptar el riesgo', () => {
    expect(climateDescription(alertOf({ accion: 'CONFIRMACION', fenomeno: 'LLUVIA_INTENSA', nivelCriticidad: 'ALTA' })))
      .toBe('Para retirar una bicicleta en Palermo vas a tener que aceptar el riesgo climático (calzada resbaladiza).');
  });

  it('BLOQUEO informa que no se inician viajes y que las devoluciones siguen permitidas', () => {
    const text = climateDescription(alertOf({ accion: 'BLOQUEO', barrios: ['Palermo', 'Recoleta'] }));
    expect(text).toBe('No se pueden iniciar viajes desde estaciones de Palermo y Recoleta (tormenta fuerte). Las devoluciones siguen permitidas.');
  });

  it('BLOQUEO_Y_AVISO_VIAJES agrega el aviso a viajes en curso', () => {
    expect(climateDescription(alertOf({ accion: 'BLOQUEO_Y_AVISO_VIAJES', fenomeno: 'GRANIZO' })))
      .toMatch(/^No se pueden iniciar viajes desde estaciones de Palermo \(caída de granizo\)\..*te sugerimos dónde devolver/);
  });

  it('una alerta programada habla en futuro', () => {
    const text = climateDescription(alertOf({ accion: 'BLOQUEO', activa: false, fenomeno: 'TORMENTA_ELECTRICA' }));
    expect(text).toMatch(/^Desde el .* no se podrán iniciar viajes desde estaciones de Palermo \(riesgo de rayos\)\. Las devoluciones seguirán permitidas\.$/);
  });

  it('el texto depende de la acción y no del nivel', () => {
    const electricMedium = alertOf({ accion: 'BLOQUEO', fenomeno: 'TORMENTA_ELECTRICA', nivelCriticidad: 'MEDIA' });
    const rainHigh = alertOf({ accion: 'CONFIRMACION', fenomeno: 'LLUVIA_INTENSA', nivelCriticidad: 'ALTA' });
    expect(climateDescription(electricMedium)).toMatch(/No se pueden iniciar viajes/);
    expect(climateDescription(rainHigh)).toMatch(/aceptar el riesgo climático/);
    expect(climateDescription(rainHigh)).not.toMatch(/No se pueden iniciar viajes/);
  });

  it('sin barrios usa el área afectada y un fenómeno desconocido no agrega sufijo', () => {
    expect(climateDescription(alertOf({ accion: 'AVISO', barrios: [], fenomeno: 'TSUNAMI' })))
      .toBe('Circulá con precaución en el área afectada.');
  });
});

describe('climateColor y climateTone', () => {
  it('rojo solo cuando bloquea el alquiler', () => {
    expect(climateColor(alertOf({ accion: 'BLOQUEO' }))).toBe('red');
    expect(climateColor(alertOf({ accion: 'BLOQUEO_Y_AVISO_VIAJES' }))).toBe('red');
    expect(climateColor(alertOf({ accion: 'CONFIRMACION' }))).toBe('orange');
    expect(climateColor(alertOf({ accion: 'AVISO' }))).toBe('orange');
  });

  it('el tono distingue bloqueo, confirmación y aviso', () => {
    expect(climateTone(alertOf({ accion: 'BLOQUEO' }))).toBe('blocked');
    expect(climateTone(alertOf({ accion: 'CONFIRMACION' }))).toBe('confirm');
    expect(climateTone(alertOf({ accion: 'AVISO' }))).toBe('notice');
  });
});

describe('fenómenos', () => {
  it('muestra nombres legibles con tildes', () => {
    expect(phenomenonLabel('TORMENTA_ELECTRICA')).toBe('Tormenta eléctrica');
    expect(phenomenonLabel('OLA_DE_FRIO')).toBe('Ola de frío');
    expect(phenomenonLabel('HURACAN')).toBe('Huracán');
  });

  it('un fenómeno desconocido se muestra legible y con el ícono genérico', () => {
    expect(phenomenonLabel('NIEBLA_DENSA')).toBe('Niebla densa');
    expect(phenomenonVisual('NIEBLA_DENSA').accent).toBe('#495057');
    expect(phenomenonVisual('NIEVE').accent).not.toBe('#495057');
  });
});

describe('etiquetas', () => {
  it('actionLabel cubre las cuatro respuestas', () => {
    expect(actionLabel('AVISO')).toBe('Aviso');
    expect(actionLabel('CONFIRMACION')).toBe('Requiere confirmación');
    expect(actionLabel('BLOQUEO')).toBe('Alquiler bloqueado');
    expect(actionLabel('BLOQUEO_Y_AVISO_VIAJES')).toBe('Alquiler bloqueado · aviso a viajes');
  });

  it('stationClimateNotice sale de la acción', () => {
    expect(stationClimateNotice(alertOf({ accion: 'BLOQUEO' }))).toBe('No se pueden iniciar viajes desde esta estación.');
    expect(stationClimateNotice(alertOf({ accion: 'CONFIRMACION' }))).toMatch(/aceptar el riesgo/);
    expect(stationClimateNotice(alertOf({ accion: 'AVISO' }))).toBe('Circulá con precaución.');
  });

  it('ordena vigentes antes que programadas y, dentro de cada grupo, de la más restrictiva a la menos', () => {
    const sorted = [
      alertOf({ alertaId: 'aviso', accion: 'AVISO', nivelCriticidad: 'CRITICA' }),
      alertOf({ alertaId: 'programada', accion: 'BLOQUEO', activa: false }),
      alertOf({ alertaId: 'confirmacion', accion: 'CONFIRMACION' }),
      alertOf({ alertaId: 'bloqueo', accion: 'BLOQUEO' }),
    ].sort(compareClimateAlerts).map((alert) => alert.alertaId);
    expect(sorted).toEqual(['bloqueo', 'confirmacion', 'aviso', 'programada']);
  });
});

describe('climateGlyphSvg', () => {
  it('arma el SVG del ícono del fenómeno sin atributos internos de React', async () => {
    const { climateGlyphSvg } = await import('./climateGlyphs');
    const svg = climateGlyphSvg('TORMENTA_ELECTRICA');
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/);
    expect(svg).toContain('<path d="m13 12-3 5h4l-3 5"/>');
    expect(svg).not.toContain('key=');
    expect(climateGlyphSvg('NIEBLA')).not.toBe(svg);
  });
});
