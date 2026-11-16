/**
 * Datos SVG de un ícono de lucide-react. Se usan en los marcadores de Leaflet, que se arman como HTML,
 * para no tener que incluir react-dom/server en el bundle solo para eso.
 */
declare module 'lucide-react/dist/esm/icons/*.mjs' {
  export const __iconNode: [elementName: string, attrs: Record<string, string>][];
}
