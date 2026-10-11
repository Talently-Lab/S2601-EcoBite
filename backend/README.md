# Backend — API REST de EcoBite

## Descripción

Backend de la plataforma web EcoBite, desarrollado con **Node.js, NestJS y TypeScript**.

El backend proporciona la base para las funcionalidades de la plataforma, incluyendo la gestión de usuarios, restaurantes, productos y pedidos, así como las métricas relacionadas con el impacto ambiental.

## Stack Tecnológico

- **Runtime:** Node.js
- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **Autenticación:** JWT
- **Password hashing:** bcrypt
- **API testing:** Postman
- **API documentation:** Swagger / OpenAPI

## Estructura del proyecto

```text
backend/
├── src/
│   ├── modules/             # Módulos principales
│   ├── common/              # Recursos compartidos
│   ├── prisma/
│   │   ├── migrations/      # Migraciones
│   │   └── schema.prisma    # Esquema de Prisma
│   ├── app.module.ts        # Módulo raíz
│   └── main.ts              # Punto de entrada
├── package.json
└── README.md
```

La estructura interna de `modules/` se organiza según las funcionalidades del MVP. Cada módulo puede contener sus propios controllers, services, DTOs y otros recursos necesarios.

## Ejecución local

Desde la carpeta `backend`, instalar dependencias:

```powershell
npm install
```

Configurar las variables de entorno requeridas, incluyendo la conexión a PostgreSQL y los secretos utilizados por la autenticación.

Iniciar el servidor:

```powershell
npm run start:dev
```

La API estará disponible en:

```text
http://localhost:3000/api
```

La documentación Swagger estará disponible en:

```text
http://localhost:3000/docs
```

## Datos y base de datos

El proyecto utiliza PostgreSQL como base de datos y Prisma como ORM.
La base de datos se encuentra alojada en **Neon**.
Los datos iniciales de restaurantes se cargan mediante un archivo CSV y el script de seed.

Archivo de datos:

```text
docs/api/data-model/restaurants.csv
```

Seed:

```powershell
npx tsx src\prisma\seed.ts
```

La configuración de Prisma se encuentra en:

```text
prisma.config.ts
```

El esquema se encuentra en:

```text
src/prisma/schema.prisma
```

Las migraciones se encuentran en:

```text
src/prisma/migrations/
```

## API

La API REST utiliza el prefijo:

```text
/api
```

## Documentación de la API

Swagger / OpenAPI está disponible durante el desarrollo en:

```text
http://localhost:3000/docs
```

Swagger permite consultar los endpoints disponibles y realizar pruebas sobre la API.

## Pruebas realizadas

La funcionalidad de autenticación y catálogo fue verificada mediante Postman y Swagger.

Se verificaron, entre otros, los siguientes escenarios:

- Registro de usuario exitoso.
- Contraseñas almacenadas mediante bcrypt.
- Login con credenciales válidas.
- Rechazo de credenciales inválidas.
- Acceso público al catálogo con `200 OK`.
- Catálogo cargado con datos de restaurantes del dataset.
- Respuestas de usuario sin exposición de `password` ni `passwordHash`.

## Autenticación y seguridad

La API utiliza **JWT** para autenticar a los usuarios.
Las contraseñas se almacenan mediante **bcrypt** y nunca se guardan en texto plano.
El access token JWT se gestiona mediante una cookie HTTP-only y las rutas protegidas requieren autenticación.
Además, las solicitudes que modifican datos están protegidas mediante **CSRF token**.

La autenticación se implementa mediante:

- JWT Strategy de Passport.
- `JwtAuthGuard` como guard global.
- Cookies HTTP-only para el access token.
- bcrypt para el hash de contraseñas.
- CSRF Guard para protección contra solicitudes no autorizadas.
