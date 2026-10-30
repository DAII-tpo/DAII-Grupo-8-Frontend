/**
 * Catalog of dashboards hosted by the BI module.
 *
 * No data processing or chart rendering occurs in Movilidad: BI owns its HTML and metrics.
 * URL validation avoids unsafe iframe schemes. The dashboard list is build-time Vite config.
 */
export interface AnalyticsDashboard {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface AnalyticsDashboardConfig {
  dashboards: AnalyticsDashboard[];
  errors: string[];
}

const dashboardIdPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;

function validDashboardUrl(rawUrl: string, allowLocalHttp: boolean): string | null {
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password) return null;

    const isHttps = url.protocol === 'https:';
    const isLocalHttp = allowLocalHttp && url.protocol === 'http:'
      && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

    return isHttps || isLocalHttp ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * VITE_ANALYTICS_DASHBOARDS: JSON array of {id,title,url,description?}.
 * VITE_ANALYTICS_EMBED_URL: backwards-compatible, optional generic dashboard.
 * Returns only valid entries; any malformed value is reported for the deployment owner.
 */
export function parseAnalyticsDashboardConfig(
  generalUrl: string,
  dashboardsJson: string,
  allowLocalHttp = false,
): AnalyticsDashboardConfig {
  const dashboards: AnalyticsDashboard[] = [];
  const errors: string[] = [];
  const ids = new Set<string>();

  if (dashboardsJson.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(dashboardsJson);
    } catch {
      errors.push('VITE_ANALYTICS_DASHBOARDS no contiene JSON válido.');
    }

    if (parsed !== undefined) {
      if (!Array.isArray(parsed)) {
        errors.push('VITE_ANALYTICS_DASHBOARDS debe ser un arreglo de dashboards.');
      } else {
        parsed.forEach((value: unknown, index) => {
          if (value === null || typeof value !== 'object' || Array.isArray(value)) {
            errors.push(`Dashboard #${index + 1}: entrada inválida.`);
            return;
          }
          const entry = value as Record<string, unknown>;
          if (typeof entry.id !== 'string' || !dashboardIdPattern.test(entry.id)
              || typeof entry.title !== 'string' || !entry.title.trim()
              || typeof entry.url !== 'string') {
            errors.push(`Dashboard #${index + 1}: faltan id, title o url válidos.`);
            return;
          }
          if (ids.has(entry.id)) {
            errors.push(`Dashboard #${index + 1}: id duplicado (${entry.id}).`);
            return;
          }
          const url = validDashboardUrl(entry.url.trim(), allowLocalHttp);
          if (!url) {
            errors.push(`Dashboard #${index + 1}: URL inválida o insegura.`);
            return;
          }
          ids.add(entry.id);
          dashboards.push({
            id: entry.id,
            title: entry.title.trim(),
            url,
            ...(typeof entry.description === 'string' && entry.description.trim()
              ? { description: entry.description.trim() }
              : {}),
          });
        });
      }
    }
  }

  if (generalUrl.trim() && !ids.has('general')) {
    const url = validDashboardUrl(generalUrl.trim(), allowLocalHttp);
    if (url) {
      dashboards.unshift({ id: 'general', title: 'Vista general', url });
    } else {
      errors.push('VITE_ANALYTICS_EMBED_URL debe ser una URL HTTPS válida.');
    }
  }

  return { dashboards, errors };
}
