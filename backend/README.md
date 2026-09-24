# Backend — API REST de EcoBite

## Descripción

API REST desarrollada con **Node.js + NestJS + TypeScript** que sustenta la plataforma EcoBite. Maneja autenticación de usuarios, gestión de restaurantes, procesamiento de pedidos y cálculo de métricas de impacto ambiental.

## Stack Tecnológico

- **Runtime:** Node.js
- **Framework:** NestJS
- **Language:** TypeScript
- **Autenticación:** JWT (JSON Web Tokens)
- **Password hashing:** bcrypt
- **Base de datos:** PostgreSQL
- **ORM:** Prisma
- **API testing/documentation:** Postman

## Estructura de carpetas

```text
backend/
├── src/
│   ├── modules/             # Módulos principales de la aplicación
│   ├── common/              # Recursos compartidos entre módulos
│   ├── app.module.ts        # Módulo raíz de la aplicación
│   └── main.ts              # Punto de entrada de la aplicación
├── prisma/
│   ├── schema.prisma        # Esquema de la base de datos
├── .env.example             # Variables de entorno (plantilla)
├── package.json
└── README.md                # Este archivo
```

La estructura interna de `modules/` se definirá según las funcionalidades del MVP. Cada módulo puede contener sus propios controllers, services, DTOs y otros recursos necesarios.

## Primeros pasos

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores correspondientes al entorno local.

### 3. Configurar la base de datos

```bash
npx prisma migrate dev
```

### 4. Iniciar servidor (desarrollo)

```bash
npm run start:dev
```

El servidor estará disponible en:

`http://localhost:3000`

## API

Los endpoints de la API serán definidos y documentados durante el desarrollo del backend.

La colección de Postman se almacenará en:

`/docs/api/`

## Consideraciones técnicas

- Todas las contraseñas se almacenan utilizando hashing con bcrypt y nunca en texto plano.
- Los tokens JWT se firman utilizando una clave secreta almacenada en `.env`.
- Las rutas que requieren autenticación estarán protegidas mediante los mecanismos de autorización correspondientes de NestJS.
- Los recursos administrativos estarán protegidos mediante autenticación y control de acceso basado en roles (RBAC), cuando corresponda.
- La API utilizará códigos de estado HTTP apropiados para cada operación.
- Las credenciales y otros valores sensibles no deben incluirse directamente en el código fuente.

## Próximos pasos

- [ ] Configurar conexión con PostgreSQL
- [ ] Definir modelos y relaciones de datos
- [ ] Configurar Prisma
- [ ] Implementar autenticación y autorización
- [ ] Implementar validación de datos
- [ ] Implementar los módulos y endpoints del MVP
- [ ] Crear seed data para testing
- [ ] Documentar y probar endpoints en Postman
- [ ] Configurar deploy a producción

```

Los cambios más importantes son estos:

`controllers/` ya no aparece como si allí estuviera la lógica de negocio. En NestJS, normalmente el controller recibe la petición y delega la lógica al service.

`routes/` tampoco hace falta como carpeta independiente: **NestJS utiliza decorators en los controllers para definir las rutas**.

`server.js` pasa a ser `main.ts`, porque estás usando TypeScript y ese es el punto de entrada habitual de una aplicación NestJS.

También agregué `prisma/schema.prisma`, porque si Prisma forma parte del stack, ese archivo sí es una pieza fundamental del proyecto.

Y corregí la referencia de Postman: en tu versión decía `/docs/api/postman-collection.json`, pero la estructura que definieron ubica `api/` dentro de `docs/`, por lo que conceptualmente debería quedar allí, no dentro de `backend/`.

Finalmente, **no fijaría todavía los endpoints de autenticación, restaurantes, pedidos y dashboard en este README**. Es mejor agregarlos cuando Backend y el equipo hayan definido realmente el contrato de la API. Así el README no termina documentando endpoints que después cambien.
```
