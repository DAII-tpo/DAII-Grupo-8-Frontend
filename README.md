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
```

El login demo asigna el `X-User-Id` de la sesión autenticada: USER usa `1` y ADMIN usa `2`.
`VITE_RECOMMENDATION_SERVICE_URL` es opcional y se usa para el warm-up no bloqueante del servicio de recomendaciones.

## Ejecucion local

```bash
npm run dev
```

## Login demo temporal

Hasta integrar el Login Federado, el frontend usa credenciales hardcodeadas solo para esta etapa:

```text
Usuario: user@citypass.com | Clave: citypass123 | Rol: USER
Usuario: admin@citypass.com | Clave: citypass123 | Rol: ADMIN
```

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
.