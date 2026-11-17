import { __iconNode as cloudAlert } from 'lucide-react/dist/esm/icons/cloud-alert.mjs';
import { __iconNode as cloudHail } from 'lucide-react/dist/esm/icons/cloud-hail.mjs';
import { __iconNode as cloudLightning } from 'lucide-react/dist/esm/icons/cloud-lightning.mjs';
import { __iconNode as cloudRain } from 'lucide-react/dist/esm/icons/cloud-rain.mjs';
import { __iconNode as cloudRainWind } from 'lucide-react/dist/esm/icons/cloud-rain-wind.mjs';
import { __iconNode as snowflake } from 'lucide-react/dist/esm/icons/snowflake.mjs';
import { __iconNode as thermometerSnowflake } from 'lucide-react/dist/esm/icons/thermometer-snowflake.mjs';
import { __iconNode as thermometerSun } from 'lucide-react/dist/esm/icons/thermometer-sun.mjs';
import { __iconNode as tornado } from 'lucide-react/dist/esm/icons/tornado.mjs';
import { __iconNode as wind } from 'lucide-react/dist/esm/icons/wind.mjs';

type IconNode = [elementName: string, attrs: Record<string, string>][];

/** Mismos íconos que {@code phenomenonVisual} en climateCopy, como datos SVG. */
const NODES: Readonly<Record<string, IconNode>> = {
  TORMENTA_ELECTRICA: cloudLightning,
  HURACAN: tornado,
  NIEVE: snowflake,
  GRANIZO: cloudHail,
  TORMENTA_FUERTE: cloudRainWind,
  VIENTO_FUERTE: wind,
  LLUVIA_INTENSA: cloudRain,
  OLA_DE_CALOR: thermometerSun,
  OLA_DE_FRIO: thermometerSnowflake,
};

function escapeAttribute(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

const cache = new Map<string, string>();

/** SVG (string) del ícono del fenómeno, para usar dentro de un {@code divIcon} de Leaflet. */
export function climateGlyphSvg(fenomeno: string, size = 13, strokeWidth = 2.4): string {
  const key = `${fenomeno.trim().toUpperCase()}|${size}|${strokeWidth}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const node = NODES[fenomeno.trim().toUpperCase()] ?? cloudAlert;
  const children = node.map(([tag, attrs]) => {
    const attributes = Object.entries(attrs)
      .filter(([name]) => name !== 'key')
      .map(([name, value]) => `${name}="${escapeAttribute(String(value))}"`)
      .join(' ');
    return `<${tag} ${attributes}/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${children}</svg>`;
  cache.set(key, svg);
  return svg;
}
