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
VITE_DEMO_USER_ID=ID_DE_UN_USUARIO_EXISTENTE
```

`VITE_DEMO_USER_ID` se utiliza temporalmente para enviar el header `X-User-Id` al consultar o iniciar viajes. Debe corresponder a un usuario existente en el backend y será reemplazado por la identidad provista por Login Federado.

## Ejecucion local

```bash
npm run dev
```

## Login demo temporal

Hasta integrar el Login Federado, el frontend usa credenciales hardcodeadas solo para esta etapa:

```text
Usuario: demo@citypass.com
Clave: citypass123
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