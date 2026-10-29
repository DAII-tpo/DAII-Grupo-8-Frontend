import { describe, expect, it } from 'vitest';

import { parseAnalyticsDashboardConfig } from './dashboardConfig';

describe('parseAnalyticsDashboardConfig', () => {
  it('continúa aceptando la URL del dashboard general', () => {
    const result = parseAnalyticsDashboardConfig('https://bi.citypass.example/tablero', '');
    expect(result.errors).toEqual([]);
    expect(result.dashboards).toEqual([{
      id: 'general',
      title: 'Vista general',
      url: 'https://bi.citypass.example/tablero',
    }]);
  });

  it('acepta tantos dashboards por caso de uso como se configuren', () => {
    const dashboards = JSON.stringify([
      { id: 'cu-int-01', title: 'Ruta urbana', url: 'https://bi.example/cu1' },
      { id: 'cu-int-02', title: 'Otro caso', url: 'https://bi.example/cu2' },
    ]);
    const result = parseAnalyticsDashboardConfig('https://bi.example/general', dashboards);
    expect(result.errors).toEqual([]);
    expect(result.dashboards.map((dashboard) => dashboard.id))
      .toEqual(['general', 'cu-int-01', 'cu-int-02']);
  });

  it('da prioridad al dashboard general especificado en el catálogo', () => {
    const result = parseAnalyticsDashboardConfig('https://bi.example/antiguo', JSON.stringify([
      { id: 'general', title: 'Tablero nuevo', url: 'https://bi.example/nuevo' },
    ]));
    expect(result.dashboards).toHaveLength(1);
    expect(result.dashboards[0].url).toBe('https://bi.example/nuevo');
  });

  it('rechaza URLs maliciosas, duplicados y valores incompletos sin bloquear los válidos', () => {
    const result = parseAnalyticsDashboardConfig('', JSON.stringify([
      { id: 'uno', title: 'Uno', url: 'https://bi.example/uno' },
      { id: 'uno', title: 'Repetido', url: 'https://bi.example/dos' },
      { id: 'dos', title: 'Malo', url: 'javascript:alert(1)' },
      { id: 'tres', title: 'Incompleto' },
      { id: 'cuatro', title: 'Credenciales', url: 'https://u:secreto@bi.example' },
      { id: 'cinco', title: 'No seguro', url: 'http://bi.example' },
    ]));
    expect(result.dashboards.map((dashboard) => dashboard.id)).toEqual(['uno']);
    expect(result.errors).toHaveLength(5);
  });

  it('informa errores de JSON y de esquema', () => {
    expect(parseAnalyticsDashboardConfig('', '{').errors).toHaveLength(1);
    expect(parseAnalyticsDashboardConfig('', '{}').errors).toHaveLength(1);
  });

  it('permite http solo para servicios locales en modo desarrollo', () => {
    expect(parseAnalyticsDashboardConfig('http://localhost:5173/bi', '', true).dashboards)
      .toHaveLength(1);
    expect(parseAnalyticsDashboardConfig('http://bi.example/test', '', true).dashboards)
      .toHaveLength(0);
    expect(parseAnalyticsDashboardConfig('http://localhost:5173/bi', '', false).dashboards)
      .toHaveLength(0);
  });

  it('no configura un dashboard ni simula datos cuando BI no proporcionó URLs', () => {
    expect(parseAnalyticsDashboardConfig('', '')).toEqual({ dashboards: [], errors: [] });
  });
});
