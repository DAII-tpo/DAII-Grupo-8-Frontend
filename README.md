# CityPass+ Frontend Movilidad

Frontend base del modulo Movilidad Urbana Inteligente de CityPass+.

Este proyecto deja preparada una estructura inicial con React, TypeScript, Vite, Mantine, HeroUI, React Router y Axios. El alcance actual corresponde al ticket MOV-005: estructura, routing, layout base, variables de entorno y cliente HTTP. No incluye autenticacion real, mapas, endpoints ni logica de negocio.

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
```

## Ejecucion local

```bash
npm run dev
```

## Validaciones

```bash
npm run lint
npm run typecheck
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
