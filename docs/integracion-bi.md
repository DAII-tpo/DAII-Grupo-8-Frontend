# Integración visual de BI en Movilidad

**Objetivo:** mostrar los dashboards HTML generados y alojados por el módulo Analítica (BI)
dentro de la sección `/movilidad/analitica`, para **cualquier caso de uso** de Movilidad.
Los gráficos y las métricas son responsabilidad de BI: **Movilidad no los recrea ni inventa datos**.

## Cómo configurarlo en Vercel / local

La configuración se carga al compilar Vite, por lo que después de modificar las variables
de Vercel hay que volver a desplegar el frontend.

**Opción A — un tablero general con los casos y filtros que provee BI:**

```dotenv
VITE_ANALYTICS_EMBED_URL=https://bi.example.org/movilidad
```

**Opción B — múltiples tableros, uno por caso de uso:**

```dotenv
VITE_ANALYTICS_DASHBOARDS=[{"id":"cu-int-01","title":"CU-INT-01 · Ruta urbana","description":"Incidentes y estaciones","url":"https://bi.example.org/cu-int-01"},{"id":"cu-int-02","title":"CU-INT-02","url":"https://bi.example.org/cu-int-02"}]
```

La variable `VITE_ANALYTICS_DASHBOARDS` es un **array JSON** de objetos:
- `id` obligatorio: identificador único, letras minúsculas, números y guiones.
- `title` obligatorio: texto del selector.
- `url` obligatorio: URL HTTPS absoluta del HTML alojado por BI.
- `description` opcional: breve texto descriptivo.

Las dos variables se pueden combinar: `VITE_ANALYTICS_EMBED_URL` agrega la **Vista general**
y `VITE_ANALYTICS_DASHBOARDS` agrega los casos. Si el catálogo incluye `id: "general"`,
tiene prioridad sobre la URL heredada.

El selector se muestra **solo cuando existen dos o más dashboards**.
El dashboard elegido se refleja en `?dashboard=cu-int-01`, para compartir enlaces y
volver a la misma vista. Con URL faltante se muestra un aviso claro, sin datos ficticios.
Valores JSON o URLs inválidas se informan como problemas de configuración.

Por seguridad solo se admiten enlaces HTTPS; `http://localhost` o `http://127.0.0.1`
se permiten exclusivamente en desarrollo. No colocar credenciales ni JWT en URLs o variables
`VITE_*`, porque quedan expuestas en el navegador.

## Requisitos para BI

1. Entregar la URL pública o autenticada de uno o más HTML.
2. Confirmar que permiten ser mostrados en un `iframe` desde el dominio del frontend de
   Movilidad en Vercel (CSP `frame-ancestors`, y que no lo impida `X-Frame-Options`).
3. Definir un método de autenticación compatible con una visualización entre orígenes;
   no exponer tokens de servicio en el navegador ni usar JWT en querystring.
4. Acordar actualización de los datos, filtros y mensajes cuando no hay información.
5. Probar el dashboard real desde el frontend desplegado; un iframe bloqueado por política
   de BI puede no disparar un evento de error detectable por React.
   Por eso la página incluye un enlace a abrir el HTML en otra pestaña.

**Los eventos EDA son una integración independiente de la visualización.**
El backend de Movilidad publica los eventos acordados para que BI calcule sus métricas.
La métrica solicitada para el Caso 4 es cantidad de estaciones afectadas por incidentes:
su propuesta de evento y schema están en la rama backend `feat/bi-estaciones-afectadas`,
que todavía requiere validar el contrato con BI y está basada en el CU-INT-01.
La rama backend `feat/integracion-bi` conserva la publicación previa de eventos de viajes.

## Verificación

```bash
npm ci
npm run typecheck
npm run lint
npm test
npm run build
```

La rama frontend `feat/integracion-bi` conserva `main` sin modificaciones.
