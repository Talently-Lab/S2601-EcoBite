# Frontend — Aplicación web React + Vite

## Descripción

Interfaz de EcoBite desarrollada con React 19, Vite 8 y React Router 7. Incluye catálogo de restaurantes, carrito, checkout simulado, impacto ambiental y panel de administración según el rol.

**Sitio publicado:** [s2601-eco-bite.vercel.app](https://s2601-eco-bite.vercel.app/)

**API:** [ecobite-api-test.onrender.com](https://ecobite-api-test.onrender.com/) (endpoints bajo `/api`) · **Documentación de endpoints:** [Swagger](https://ecobite-api-test.onrender.com/docs)

## Stack tecnológico

- **Interfaz:** React, React Icons, React CountUp y CSS propio.
- **Rutas:** React Router 7.
- **Estado compartido:** Context API.
- **Peticiones HTTP:** Fetch API mediante los servicios de `src/services/`.
- **Lenguajes:** TypeScript en componentes, páginas y servicios; `App.jsx` y `main.jsx` en JavaScript.

## Estructura de carpetas

```
frontend/
├── public/                 # Archivos estáticos, incluido el favicon
├── src/
│   ├── assets/             # Fuentes, íconos e imágenes
│   ├── components/         # Componentes de interfaz (core, forms, layouts, pages, shared)
│   ├── config/             # URL base de la API y configuración de rutas administrativas
│   ├── constants/          # Constantes compartidas
│   ├── context/            # Estado de usuario, carrito e impacto
│   ├── hooks/              # Hooks de restaurantes, sesión y estadísticas
│   ├── pages/              # Vistas de las rutas públicas, de cliente y de administración
│   ├── services/           # Cliente HTTP y servicios de autenticación, pedidos y datos
│   ├── styles/             # CSS global y estilos de componentes y páginas
│   ├── types/              # Tipos compartidos de TypeScript
│   ├── utils/              # Funciones auxiliares y formateadores
│   ├── App.jsx
│   └── main.jsx
├── .env.example
├── index.html
├── package.json
├── vercel.json             # Proxy de /api y rutas de la SPA en Vercel
├── vite.config.js          # Proxy de /api durante el desarrollo
└── README.md               # Este archivo
```

## Primeros pasos

Requisitos: Node.js y npm. La API está publicada en Render. Para ejecutar una API local, consultar el [README del backend](../backend/README.md).

### 1. Instalar dependencias

Desde la carpeta `frontend/`:

```bash
npm ci
```

### 2. Configurar la API

1. Copiar `.env.example` a `.env.local`.
2. Configurar `VITE_API_URL=/api`. Vite envía las solicitudes a `https://ecobite-api-test.onrender.com/api` mediante el proxy de `vite.config.js`.
3. Consultar los endpoints disponibles en [Swagger](https://ecobite-api-test.onrender.com/docs). Si se cambia el archivo de entorno con Vite abierto, reiniciar el servidor.

Si falta `VITE_API_URL`, la app usa `/api` en desarrollo y producción. Para utilizar un backend local en lugar de Render, configurar `VITE_API_URL=http://localhost:3000/api` y levantarlo según su README. Las variables `VITE_*` quedan expuestas en el navegador: no guardar secretos en ellas.

### 3. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abrir `http://localhost:5173`.

### 4. Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

## Despliegue en Vercel

El sitio se publica en Vercel con `frontend/` como raíz del proyecto, `npm run build` como comando de compilación y `dist` como directorio de salida.
En `vercel.json`, la regla `/api/:path*` debe ir **antes** de la regla que envía las rutas de React Router a `index.html`.
