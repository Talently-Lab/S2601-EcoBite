# Backend — API REST de EcoBite

## Descripción

Backend de **EcoBite**, una plataforma web FoodTech que conecta usuarios con restaurantes y promueve alternativas de consumo más sostenibles.

Desarrollado con **Node.js, NestJS y TypeScript**, proporciona una API REST para gestionar autenticación, usuarios, restaurantes, productos, pedidos y métricas de impacto ambiental.

## Stack tecnológico

- **Runtime:** Node.js
- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL (Neon)
- **ORM:** Prisma
- **Autenticación:** JWT y Passport
- **Password hashing:** bcrypt
- **Seguridad:** JWT Guards, control de roles, CSRF y CORS
- **Documentación de API:** Swagger / OpenAPI
- **Pruebas:** Jest, Postman y Swagger

## Estructura del proyecto

```text
backend/
├── src/
│   ├── modules/              # Módulos funcionales de la API
│   ├── common/               # Recursos compartidos
│   ├── bootstrap/            # Configuración de inicio de la aplicación
│   ├── prisma/
│   │   ├── migrations/       # Migraciones de base de datos
│   │   └── schema.prisma     # Esquema de Prisma
│   ├── app.module.ts         # Módulo raíz
│   └── main.ts               # Punto de entrada
├── prisma.config.ts          # Configuración de Prisma
├── package.json
└── README.md
```

Los módulos se organizan por funcionalidad y contienen los controllers, services, DTOs y demás recursos necesarios.

## Ejecución local

### 1. Instalar dependencias

Desde el directorio `backend/`:

```powershell
npm install
```

### 2. Configurar variables de entorno

Configurar las variables de entorno requeridas para la conexión a PostgreSQL, la autenticación JWT y las demás funcionalidades habilitadas.

La aplicación valida las variables obligatorias durante el inicio. Si falta alguna configuración requerida, el servidor no podrá iniciarse correctamente.

No incluir credenciales, tokens ni secretos en el repositorio.

### 3. Generar Prisma Client

```powershell
npx prisma generate
```

Este comando genera el cliente de Prisma a partir del esquema, sin aplicar migraciones ni modificar los datos de la base de datos.

### 4. Iniciar el servidor

```powershell
npm run start:dev
```

Con la configuración local predeterminada, la API estará disponible en:

- **API REST:** `http://localhost:3000/api`
- **Swagger:** `http://localhost:3000/docs`

El puerto puede variar según la configuración del entorno.

## Módulos y funcionalidades

| Módulo        | Funcionalidad                                                                  |
| ------------- | ------------------------------------------------------------------------------ |
| Autenticación | Registro, inicio y cierre de sesión; JWT y protección CSRF                     |
| Usuarios      | Gestión de usuarios y acceso a funcionalidades autenticadas                    |
| Restaurantes  | Consulta del catálogo y datos de sostenibilidad                                |
| Productos     | Gestión y consulta de productos                                                |
| Pedidos       | Creación, consulta y seguimiento de pedidos                                    |
| Dashboard     | Estadísticas administrativas, pedidos recientes y ranking de impacto ambiental |

La disponibilidad de cada operación depende de sus requisitos de autenticación y autorización.

## API y documentación

La API utiliza el prefijo:

```text
/api
```

La documentación Swagger / OpenAPI permite consultar los endpoints disponibles, sus parámetros, DTOs y respuestas documentadas.

En el entorno local:

```text
http://localhost:3000/docs
```

Las rutas protegidas requieren autenticación. Algunas operaciones también requieren permisos específicos según el rol del usuario.

Por ejemplo, `GET /api/restaurants` requiere autenticación y devuelve `401 Unauthorized` cuando se consulta sin credenciales válidas.

### Endpoints principales

| Método | Endpoint                | Funcionalidad                 |
| ------ | ----------------------- | ----------------------------- |
| POST   | `/api/auth/signup`      | Registro de usuarios          |
| POST   | `/api/auth/login`       | Inicio de sesión              |
| POST   | `/api/orders`           | Creación de pedidos           |
| GET    | `/api/restaurants`      | Consulta de restaurantes      |
| GET    | `/api/orders/me/impact` | Impacto ambiental del usuario |
| GET    | `/api/dashboard/stats`  | Estadísticas administrativas  |

Estas son las rutas principales del MVP. La documentación completa de endpoints, parámetros, autenticación y respuestas está disponible en Swagger / OpenAPI.

## Base de datos

El proyecto utiliza **PostgreSQL**, alojado en **Neon**, y **Prisma** como ORM.

Archivos principales:

| Archivo                    | Propósito                   |
| -------------------------- | --------------------------- |
| `prisma.config.ts`         | Configuración de Prisma     |
| `src/prisma/schema.prisma` | Modelos, relaciones y enums |
| `src/prisma/migrations/`   | Historial de migraciones    |
| `src/prisma/seed.ts`       | Carga inicial de datos      |

Los datos de restaurantes y pedidos históricos provienen de archivos CSV utilizados durante el desarrollo.

Los scripts de seed, importación y migración pueden modificar registros persistentes. **No deben ejecutarse sin verificar previamente la base de datos de destino, el impacto de la operación y la autorización correspondiente.**

Las actualizaciones de datos deben preservar los identificadores y las relaciones existentes.

## Indicadores de CO2

**CO₂ ahorrado promedio por pedido:** se calcula dividiendo el CO₂ total ahorrado entre la cantidad de pedidos completados (`COMPLETED`) con entrega en bicicleta (`BIKE`), incluyendo pedidos históricos (`DATASET`) y de la aplicación (`APP`). El resultado se expresa en gramos (`g`).

El CO₂ ahorrado de cada pedido se redondea a gramos enteros al guardarlo en la base de datos. El promedio se calcula utilizando esos valores almacenados, sin redondeos adicionales en el Backend.

## Autenticación y seguridad

La API incorpora las siguientes medidas:

- **JWT:** autenticación mediante tokens de acceso.
- **Cookies HTTP-only:** gestión del access token.
- **bcrypt:** almacenamiento de contraseñas mediante hashes.
- **JwtAuthGuard global:** protección de rutas, excepto las declaradas públicas.
- **Control de roles:** autorización de operaciones restringidas.
- **CSRF Guard:** protección de solicitudes que modifican datos.
- **CORS:** configuración de orígenes permitidos.
- **Validación de entorno:** comprobación de variables obligatorias al iniciar la aplicación.
- **Filtro global de excepciones:** tratamiento centralizado de errores HTTP.

Las respuestas de usuario no deben exponer contraseñas ni hashes.

## Pruebas y verificaciones

El backend utiliza **Jest** para pruebas automatizadas y **Postman / Swagger** para verificaciones funcionales de la API.

### Comandos

Ejecutar tests unitarios:

```powershell
npm test -- --runInBand --watch=false
```

Verificar tipos TypeScript:

```powershell
npx tsc --noEmit -p tsconfig.json
```

Ejecutar análisis estático sin modificaciones automáticas:

```powershell
npx eslint "{src,apps,libs,test}/**/*.ts"
```

Generar Prisma Client y compilar el backend:

```powershell
npm run build
```

## Consideraciones finales

El backend implementa las funcionalidades principales del MVP de EcoBite, incluyendo autenticación, catálogo, pedidos e indicadores de sostenibilidad.

La documentación de endpoints se mantiene en Swagger / OpenAPI. Los cambios futuros en el modelo de datos, las reglas de negocio o los contratos de API deben evaluarse y validarse antes de su implementación.
