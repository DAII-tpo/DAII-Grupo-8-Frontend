# Validación local del CU-INT-01

Base revisada: PR #25, commit `808540a80c31f4b7d3fd5680fb35d0d3041e03ca`.
Rama: `feat/cu-int-01-frontend`. No se modificó main ni se desplegó a producción.

## Cambios y aceptación

- La respuesta de una consulta anterior no debe reemplazar la recomendación del evento seleccionado.
- Actualizar el catálogo elimina la recomendación anterior, que podría pertenecer a un evento cancelado.
- Tests de carga, vacío, error y reintento, ubicación alternativa, recomendación, ausencia de estación y navegación.
- Tests de BI sin configuración, configuración inválida, iframe general, selección por URL y cambio de tablero conservando otros parámetros.
- Se conserva la integración BI y la API de destinos; no se simulan eventos en la aplicación.

## Comandos y resultados

Desde la raíz del frontend:

```sh
npm run coverage
npm run lint
npm run typecheck
npm run build
```

Vitest: 141 tests, 22 archivos. Cobertura global: líneas 87,60 %, ramas 80 %.
Las pantallas CulturalDestinations y MobilityAnalytics tienen 100 % de líneas cubiertas.
Estimación local sobre líneas modificadas respecto de origin/main (LCOV + diff):
99/99 líneas y 110/113 ramas; combinación 98,58 %. Esta estimación no sustituye
el Quality Gate remoto ni usa necesariamente el mismo algoritmo de líneas nuevas.
Build correcto, con advertencia existente de tamaño de chunks.

## Pendientes

SonarCloud y la API de GitHub están bloqueados por la política de red del entorno
(HTTP 403). No se confirmó el Quality Gate de un nuevo commit ni se publicó este
trabajo remoto. Hay que aplicar los dominios guardados en la configuración del
entorno y ejecutar CI en la rama de feature, sin mergear.

BI debe entregar URLs reales y permitir embedding mediante CSP/frame policy.
Espacios debe publicar los eventos reales y entregar ReservaConfirmada con su
schema definitivo. Las pruebas de UI usan mocks HTTP; no son E2E con otros grupos.

## Seguimiento de CI

El run 40979290850 del commit bb7fd78 falló en tests, antes de cobertura y Sonar.
Se reprodujo con Node 22.23.4: las 141 assertions pasaban, pero Mantine dejaba un
error asíncrono porque JSDOM no implementa scrollIntoView. Se añadió ese mock de
API de navegador al setup de tests. La repetición con Node 22 pasó sin errores
no manejados y conserva líneas 87,60 % y ramas 80 %. Lint, tipos y build también
se verificaron con Node 22. No se desactivaron assertions ni se ignoraron errores.
