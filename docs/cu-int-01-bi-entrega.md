# Entrega frontend CU-INT-01 y BI

Alcance: CU-INT-01 y la visualización de la métrica BI «cantidad de estaciones afectadas por incidentes».
No se cambia el login demo ni la integración de autenticación que está trabajando otro compañero.

## Cambios y ubicación

- `src/types/culturalDestination.ts`: expectedDemand opcional, compatible con un backend anterior.
- `src/pages/CulturalDestinations/index.tsx`: muestra la demanda de referencia recibida y el cupo completo,
  manteniendo el manejo de errores, NO_RECOMMENDATION y el enlace a la estación recomendada.
- `src/pages/CulturalDestinations/index.test.tsx`: prueba adicional de demanda máxima y cupo completo.

La página `/movilidad/analitica` ya integra HTML externo y está probada; no se recrean gráficos ni se
calculan indicadores de BI en el navegador. Para este caso se configurará exclusivamente el tablero
que BI entregue para estaciones afectadas. No se añadió ninguna métrica de viajes o de incidentes.

## Configuración que debe entregar BI

Un HTML: `VITE_ANALYTICS_EMBED_URL=<URL HTTPS real>`.
Varios tableros acordados: `VITE_ANALYTICS_DASHBOARDS` acepta JSON con id/title/url/description.
La capacidad genérica se conserva, pero este caso no agrega indicadores fuera de lo solicitado.
Son variables de build de Vite: configurar la URL antes de compilar el ambiente de integración.

BI debe confirmar la URL, permitir iframe desde el origen de Movilidad y definir la autenticación
compatible. No se colocan credenciales ni tokens en la URL del iframe. Hasta recibir esos datos,
la pantalla informa que espera dashboards; no se muestran números inventados.

## Pruebas

Desde la raíz, con Node 22:

```sh
npm run lint
npm run typecheck
npm run coverage
npm run build
```

Verificación local de esta entrega: 142 tests correctos en 22 archivos, lint/tipos/build correctos,
87,60 % de líneas y 80,11 % de ramas globales. Persiste una advertencia de tamaño de chunks en build.
Los tests de UI usan respuestas HTTP simuladas; no equivalen a un dashboard de BI real.
El resultado de CI/Sonar se verifica por el commit publicado, sin merges ni despliegues de producción.
