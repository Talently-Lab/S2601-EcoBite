# Frontend — Aplicación Web React + Vite

## Descripción

Interfaz web de EcoBite desarrollada con **React 19 + Vite**. Proporciona la experiencia del usuario para navegar el catálogo, crear pedidos y ver el impacto ambiental generado.

## Stack Tecnológico

- **Framework:** React 19
- **Build tool:** Vite
- **Routing:** React Router v7
- **Estilos:** CSS con variables y archivos por componente
- **State management:** Context API
- **HTTP client:** Fetch API / Axios

## Estructura de carpetas

```
frontend/
├── src/
│   ├── components/         # Componentes reutilizables
│   ├── pages/              # Páginas/rutas principales
│   ├── services/           # Llamadas a API
│   ├── context/            # Estado global (carrito, autenticación)
│   ├── styles/             # Estilos y variables CSS
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
├── vite.config.js
└── README.md               # Este archivo
```

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar la API

1. Copiar `.env.example` a `.env.local`.
2. Ajustar `VITE_API_URL` con la URL de la API, incluyendo `/api` (por defecto `http://localhost:3000/api`).
3. Reiniciar Vite si estaba abierto.

### 3. Iniciar servidor (desarrollo)

```bash
npm run dev
```

La app estará disponible en `http://localhost:5173`

## Verificación

```bash
npm run lint
npm run typecheck
npm run build
```

## Documentación

Consultar el [README del backend](../backend/README.md) y [Swagger](http://localhost:3000/docs).
