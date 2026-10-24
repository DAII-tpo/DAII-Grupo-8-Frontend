# Integración de Analítica en Movilidad

La pestaña **Movilidad → Analítica** permite embeber el HTML que provea el equipo BI.

## Configuración

Definir `VITE_ANALYTICS_EMBED_URL=https://...` en el entorno del frontend (Vercel y/o local).
Sin la variable, se muestra un mensaje de configuración pendiente. No se muestran datos ficticios.

## Pendientes de BI

- URL final y si corresponde un HTML por caso de uso o una única página.
- Permiso para embeber en el dominio de Movilidad (CSP `frame-ancestors` / `X-Frame-Options`).
- Autenticación de la visualización y política de sesión; no pasar JWT por querystring.
- Filtros por caso de uso, datos de prueba, refresco y mensaje de error si no hay datos.
- Confirmación de que el HTML se puede consultar desde el navegador; los eventos de origen llegan a BI mediante EDA.

## Métricas CU-INT-01

Solo las acordadas con PM: viajes exitosos por mes (ViajeIniciado + ViajeTerminado) e incidencias por mes (ReclamoCreado + EmergenciaCreada).
