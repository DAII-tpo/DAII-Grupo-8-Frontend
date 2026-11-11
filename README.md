# CityPass+ Frontend Movilidad

Frontend base del modulo Movilidad Urbana Inteligente de CityPass+.

Frontend del módulo Movilidad Urbana Inteligente, construido con React, TypeScript, Vite, Mantine, HeroUI, React Router y Axios.

## Requisitos

- Node.js 22 o compatible con Vite.
- npm 10 o compatible.

## Instalacion

```bash
npm install
```

## Variables de entorno

Crear un archivo `.env` tomando como referencia `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_RECOMMENDATION_SERVICE_URL=https://movilidad-recommendation.onrender.com
VITE_FEDERATED_AUTH_BASE_URL=https://api.citypass-login.pp.ua
VITE_FEDERATED_CLIENT_ID=citypass-movilidad-web
```

`VITE_RECOMMENDATION_SERVICE_URL` es opcional y se usa para el warm-up no bloqueante del servicio de recomendaciones.
Las credenciales y tokens se gestionan mediante los flujos de autenticación ciudadano y federado. No se deben configurar secretos en el frontend.

## Ejecucion local

```bash
npm run dev
```

## Acceso

`/login` ofrece acceso ciudadano, registro de ciudadano e ingreso de personal municipal. La administración se muestra solo al personal del módulo Movilidad que pertenece a los grupos `admin` o `delegados`.

## Validaciones

```bash
npm run lint
npm run typecheck
npm run test
npm run coverage
npm run build
```

## Rutas iniciales

- `/login`
- `/`
- `/movilidad`
- `/movilidad/mapa`
- `/movilidad/estaciones`
- `/movilidad/bicicletas`
- `/movilidad/viaje-activo`
- `/movilidad/historial`
- `/movilidad/reportes`
- `/movilidad/administracion`


## Analítica de Movilidad

`/movilidad/analitica` está disponible exclusivamente para ADMIN según `/api/v1/users/me`.
Usa el cliente HTTP autenticado existente para pedir `/api/v1/admin/analytics/embed` al backend
configurado en `VITE_API_BASE_URL`. No requiere ninguna variable VITE de BI ni credenciales nuevas
en Vercel. `VITE_ANALYTICS_EMBED_URL` y `VITE_ANALYTICS_DASHBOARDS` ya no se usan y pueden retirarse
manualmente de la configuración de Vercel.

`status: ok` muestra conexión confirmada y espera del tablero, sin iframe ni estadísticas ficticias.
El HTML real se presenta mediante `srcDoc` en un iframe con `sandbox="allow-scripts"`, sin compartir
origen, almacenamiento ni sesión. La CSP incorporada por el backend restringe recursos y conexiones;
no se supone que srcDoc conserve las cabeceras HTTP de BI. El contenido solo permanece en memoria
y se descarta al actualizar, abandonar la pantalla o perder el rol. El interceptor HTTP conserva el
manejo existente de vencimiento/renovación del JWT humano.

La URL, las credenciales de servicio y los timeouts se configuran exclusivamente en el backend
(ver su README). Antes de usar esta versión del frontend debe estar disponible la nueva ruta del
backend. Quedan pendientes de BI el HTML autocontenido real y la validación de CSP y recursos;
no se han inventado URLs, gráficos ni respuestas de producción.

Fuera del alcance: el componente preexistente `Administration/AnalyticsDashboard` sigue usando
`analyticsMockData`; no es el embed oficial de BI y no se cambió su funcionamiento en esta entrega.
