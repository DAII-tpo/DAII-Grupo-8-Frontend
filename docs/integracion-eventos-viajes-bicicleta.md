# Integración entre eventos culturales y viajes en bicicleta

## Objetivo

Conectar la planificación de llegada a un evento cultural con el flujo existente de **Bicicletas y viajes**, sin crear un sistema nuevo de alquiler ni modificar los servicios del backend.

## Inicio del viaje desde un evento

Después de confirmar correctamente una intención de llegada aparece la acción **Iniciar viaje hacia el evento**.

El botón navega a `/movilidad/bicicletas` y transporta mediante `React Router location.state`:

- el identificador de la estación de origen, cuando la planificación dispone de uno;
- el identificador de la estación de destino confirmada para el evento.

Confirmar la intención no inicia un viaje, no selecciona una bicicleta y no realiza una reserva. El ciudadano debe elegir una bicicleta y pulsar explícitamente **Iniciar viaje**.

## Preselección de estaciones

Al ingresar a **Bicicletas y viajes** desde una planificación:

- la estación de origen se preselecciona solamente si todavía existe en el catálogo;
- al preseleccionar un origen válido se consultan sus bicicletas disponibles;
- si el origen no existe, el selector queda vacío y funciona de la manera habitual;
- la estación de destino se conserva mientras se inicia el viaje;
- una vez iniciado, el destino se preselecciona en el formulario de devolución si todavía existe;
- se consulta su disponibilidad actual antes de permitir la devolución;
- si el destino no existe o no puede utilizarse, el ciudadano puede seleccionar otra estación.

Ambos selectores permanecen editables. El inicio y la finalización continúan utilizando `tripService.start()` y `tripService.end()`.

Si el ciudadano ya tiene un viaje activo, se muestra el flujo existente y no se intenta iniciar otro automáticamente.

El acceso directo a `/movilidad/bicicletas`, sin estado de planificación, conserva el comportamiento anterior.

## Persistencia

El contexto se transporta en memoria mediante `location.state`. No se agregó `localStorage` ni otra persistencia.

Como consecuencia, el contexto de planificación se pierde si se recarga directamente la pantalla de bicicletas. Esto es intencional: ante una recarga se utiliza el flujo normal y no se realizan acciones automáticas.

## Avisos de eventos en el mapa

El mapa muestra un aviso contextual para eventos que cumplan estas condiciones:

- están dentro del área visible del mapa o a menos de 1.500 metros de la ubicación del ciudadano;
- están en curso o comienzan dentro de las próximas 24 horas.

Cuando hay varios candidatos:

1. se priorizan los eventos en curso;
2. entre eventos con el mismo estado, se muestra el que comienza primero.

El aviso ahora muestra la fecha y hora de inicio junto con la hora de finalización.

La acción **Ver evento**:

- selecciona el evento;
- muestra su detalle;
- centra el mapa sobre sus coordenadas;
- aplica un nivel de zoom que permite identificar su marcador.

Los demás eventos continúan disponibles como marcadores en el mapa aunque no sean el elegido para el aviso contextual.

## Archivos principales

- `src/pages/CulturalDestinations/index.tsx`
- `src/pages/Bicycles/index.tsx`
- `src/components/mobility/StationsMap/StationsMap.tsx`
- `src/types/tripPlanningNavigation.ts`
- `src/pages/CulturalDestinations/index.test.tsx`
- `src/pages/Bicycles/Bicycles.test.tsx`
- `src/pages/Map/Map.test.tsx`

## Validaciones realizadas

Se agregaron pruebas para verificar:

- aparición y navegación del botón de inicio desde el evento;
- transporte de las estaciones mediante el estado de navegación;
- preselección y carga de bicicletas del origen válido;
- conservación y preselección del destino después de iniciar el viaje;
- descarte de identificadores inexistentes;
- funcionamiento normal sin contexto de planificación;
- ausencia de inicios automáticos de viaje;
- visualización de la hora de finalización del evento;
- enfoque del evento en el mapa desde **Ver evento**.

También se validaron los cambios con TypeScript y ESLint.
