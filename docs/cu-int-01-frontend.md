# CU-INT-01 · Pantalla Eventos y destinos

Frontend `feat/cu-int-01-frontend` (basada en la rama visual `feat/integracion-bi`).

- Se agrega `/movilidad/eventos` y acceso desde `MobilityNavigation`.
- Lista eventos vigentes que proporciona Movilidad mediante `GET /api/v1/destinations/events`.
- Cada evento permite solicitar `GET /api/v1/destinations/events/{eventId}/recommendation`.
- El backend excluye estaciones cercanas a incidentes activos; el frontend muestra la explicación
  y no sugiere estaciones cuando el backend devuelve `NO_RECOMMENDATION`.
- Muestra estados vacíos, carga y errores sin crear eventos ni estaciones ficticios.
- Usa un enlace de Google Maps sólo si existe una estación recomendada.
- No se creó una segunda integración EDA ni se modificó el backend.

Para probar: arrancar backend CU-INT-01 y frontend de esta rama, con
`VITE_API_BASE_URL` apuntando al backend. Es necesario contar con los eventos de Espacios
en EDA o datos locales de prueba en `cultural_destinations`.

Las pruebas de API están en `src/services/destinations/culturalDestinationService.test.ts`.
