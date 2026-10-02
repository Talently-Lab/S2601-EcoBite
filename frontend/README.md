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

### 2. Configurar el login de prueba

En `.env.local`, completar `VITE_MOCK_AUTH_NAME`,
`VITE_MOCK_AUTH_EMAIL` y `VITE_MOCK_AUTH_PASSWORD` con datos de prueba.
El archivo `.env.local` está ignorado por Git. Reiniciar Vite después de modificarlo.
Sin configuración, el login muestra un error y no permite ingresar.

Después de cerrar sesión, solo puede iniciarse
sesión con la cuenta configurada en `.env.local`. La sesión se pierde al recargar.

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

Ver `/docs/api/postman-collection.json` para entender qué endpoints consume el frontend.
