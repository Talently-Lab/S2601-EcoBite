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

## Estructura de carpetas

```text
backend/
├── src/
│   ├── modules/             # Módulos principales
│   ├── common/              # Recursos compartidos
│   ├── prisma/
│   │   ├── migrations/      # Migraciones
│   │   └── schema.prisma    # Esquema de Prisma
│   ├── app.module.ts        # Módulo raíz
│   └── main.ts              # Punto de entrada
├── package.json
└── README.md
```

La estructura interna de `modules/` se organiza según las funcionalidades del MVP. Cada módulo puede contener sus propios controllers, services, DTOs y otros recursos necesarios.

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Crear un archivo `.env` a partir de `.env.example` y completar las variables requeridas.

```bash
cp .env.example .env
```

En Windows PowerShell, también puede utilizarse:

```powershell
Copy-Item .env.example .env
```

La configuración debe incluir las variables necesarias para la conexión con la base de datos y la autenticación.

### 3. Configurar la base de datos

El proyecto utiliza **PostgreSQL** y **Prisma ORM**.

Las migraciones se encuentran en:

```text
src/prisma/migrations/
```

Para verificar el estado de las migraciones:

```bash
npx prisma migrate status
```

Las migraciones existentes deben aplicarse según el entorno de desarrollo y la configuración de la base de datos.

### 4. Iniciar el servidor en desarrollo

```bash
npm run start:dev
```

El servidor estará disponible en:

```text
http://localhost:3000
```

## API

La API REST utiliza el prefijo `/api`.

### Endpoints implementados

- `POST /api/users/register` — registro de nuevos usuarios.
- `POST /api/auth/login` — autenticación de usuarios.
- `GET /api/restaurants` — listado de restaurantes para usuarios autenticados.

Los endpoints requieren las condiciones de autenticación correspondientes según cada ruta.

### Documentación y pruebas

La documentación de la API está disponible mediante Swagger / OpenAPI.

Con el servidor ejecutándose localmente, Swagger puede consultarse en:

```text
http://localhost:3000/docs
```

Los endpoints también pueden probarse mediante Postman.

## Datos y base de datos

El proyecto utiliza `dataset.csv` como fuente de datos para la carga inicial de restaurantes y pedidos.

El seed de Prisma se encuentra en:

```text
src/prisma/seed.ts
```

La configuración del seed se encuentra en:

```text
prisma.config.ts
```

La base de datos utilizada para el entorno actual es **PostgreSQL en Neon**.

La variable `DATABASE_URL` debe configurarse mediante variables de entorno y no debe incluirse directamente en el código fuente.

## Consideraciones técnicas

- Las contraseñas se almacenan utilizando hashing con bcrypt y nunca en texto plano.
- Los tokens JWT utilizan una clave secreta almacenada mediante variables de entorno.
- Las rutas que requieren autenticación están protegidas mediante los mecanismos de autenticación y autorización correspondientes de NestJS.
- Los recursos que requieran permisos específicos podrán utilizar control de acceso basado en roles (RBAC).
- La API utiliza códigos de estado HTTP apropiados para cada operación.
- Las credenciales y otros valores sensibles no deben incluirse directamente en el código fuente.
- La configuración específica de cada entorno debe mantenerse mediante variables de entorno.

## Próximos pasos

- Completar la autenticación y autorización mediante JWT y Guards de NestJS.
- Implementar y completar la validación de datos mediante DTOs.
- Completar los módulos correspondientes a las funcionalidades restantes del MVP.
- Continuar documentando y probando los endpoints mediante Swagger y Postman.
- Evaluar el despliegue del backend en un entorno accesible externamente.
