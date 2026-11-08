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
