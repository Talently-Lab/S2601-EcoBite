# EcoBite — Plataforma de Delivery Sustentable 🥑

## Visión

EcoBite es una startup de FoodTech que revoluciona la industria del delivery. Conecta usuarios con restaurantes locales que utilizan envases 100% biodegradables y realizan entregas mediante transporte sin emisiones (bicicletas o vehículos eléctricos). Este MVP valida el modelo de negocio, mide el impacto ambiental real y establece una identidad de marca sólida.

**Duración:** 8 semanas | **Modelo:** Simulación educativa (Talently Lab - Cohorte S2601)

---

## 🎯 Objetivo del MVP

- **Validar el modelo de negocio** con usuarios reales
- **Medir y visualizar el ahorro de huella de carbono** mediante un dashboard de datos
- **Establecer una identidad visual cohesiva** y una estrategia de Go-To-Market
- **Generar métricas confiables** para futuras rondas de inversión

---

## 📦 Alcance (In Scope)

### Funcionalidades Core

- **Autenticación de usuarios** — Registro, login, JWT, gestión de roles
- **Catálogo de restaurantes** — Listado, perfiles, indicadores de sustentabilidad
- **Flujo de compra simulado** — Carrito, checkout (sin pasarela real), confirmación de pedido
- **Dashboard de impacto ambiental** — KPIs de negocio, CO2 ahorrado, panel admin protegido (RBAC)

### Brand & Marketing

- **Manual de marca** — Paleta de colores, tipografía, isologotipo
- **Estrategia GTM** — Buyer personas, canales de adquisición, copy
- **Assets** — Banners, emails transaccionales, piezas para redes sociales

### Calidad & Testing

- **Test Plan completo** — Casos de prueba funcionales, de seguridad, de regresión
- **Cobertura de endpoints API** — Validación en Postman, documentación
- **Sign-off de calidad** antes del deploy a producción

---

## ❌ Fuera de Alcance

- Pasarela de pagos real
- Geolocalización avanzada / tracking en tiempo real del repartidor
- App mobile nativa (solo web responsive)
- Chat en vivo usuario-restaurante

---

## 👥 Equipo — Grupo S2601

### Rol & Responsable

**Project Manager:** Jonathan

**Backend Developer:** Sigrid

**Frontend Developer:** Ornella

**Diseñador Gráfico:** Micaela Ayelén

**Diseñador UX/UI:** Agostina  

**Especialista de Marketing:** Milagros  

**Data Analyst:** Miguel  

**Data Analyst:** Ángela Micaela

**Tester QA Manual:** Elizabeth  

**Tester QA Manual:** Mayra  

---

## 📁 Estructura del Repositorio

```
ecobite-workspace/
├── backend/                          # API REST (Node.js + Express)
│   ├── src/
│   │   ├── controllers/              # Lógica de negocio
│   │   ├── models/                   # Modelos de BD
│   │   ├── routes/                   # Definición de rutas
│   │   └── middleware/               # JWT, autenticación, etc.
│   ├── .env.example                  # Variables de entorno (plantilla)
│   ├── package.json                  # Dependencias Node.js
│   └── README.md                     # Documentación técnica del backend
│
├── frontend/                         # SPA React + Vite
│   ├── src/
│   │   ├── components/               # Componentes reutilizables
│   │   ├── pages/                    # Páginas/rutas
│   │   ├── services/                 # Llamadas a API
│   │   ├── context/                  # Context API (estado global)
│   │   └── styles/                   # Tailwind / CSS
│   ├── index.html
│   ├── package.json
│   └── README.md                     # Documentación técnica del frontend
│
├── docs/                             # Documentación general del proyecto
│   ├── pm/
│   │   ├── cronogramas/              # Roadmap, backlog
│   │   ├── minutas/                  # Actas de reuniones
│   │   └── reportes/                 # Reportes semanales (semáforo)
│   ├── qa/
│   │   ├── test-plan.md              # Plan de pruebas
│   │   └── bugs/                     # Reportes de bugs
│   └── api/
│       ├── postman-collection.json   # Endpoints documentados
│       └── README.md                 # Especificación de API
│
├── product_y_growth/                 # Estrategia, datos, diseño
│   ├── marketing/
│   │   ├── buyer-personas.md         # Perfiles de usuarios
│   │   ├── go-to-market.md           # Estrategia de lanzamiento
│   │   ├── copys.md                  # Microcopy, emails, redes
│   │   └── assets/                   # Banners, templates
│   ├── data/
│   │   ├── datasets/                 # CSVs simulados, limpios
│   │   ├── queries.sql               # Consultas base de KPIs
│   │   └── dashboards/               # Links a Power BI / Looker Studio
│   └── design/
│       ├── brand-guide.pdf           # Manual de marca
│       ├── paleta-colores.md         # Códigos HEX, tipografía
│       └── assets/                   # Logo, íconos, mockups (SVG/PNG)
│
├── .gitignore                        # Archivos a ignorar en git
├── LICENSE                           # (Opcional) Licencia del proyecto
└── README.md                         # Este archivo
```

---

## 🚀 Cómo empezar

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/S2601-EcoBite.git
cd S2601-EcoBite
```

### 2. Configurar Backend (Node.js + Express)

```bash
cd backend
npm install
cp .env.example .env          # Configurar variables locales
npm run dev                    # Inicia el servidor en puerto 3000
```

### 3. Configurar Frontend (React + Vite)

```bash
cd frontend
npm install
npm run dev                    # Inicia en puerto 5173
```

### 4. Acceder a la aplicación

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3000/api

---

## 📊 Stack Tecnológico

| Layer              | Tecnología                                    |
| ------------------ | --------------------------------------------- |
| **Frontend**       | React 18, Vite, React Router, Tailwind CSS    |
| **Backend**        | Node.js, Express, JWT (autenticación)         |
| **Base de datos**  | PostgreSQL o MongoDB (TBD)                    |
| **Hosting (Dev)**  | Localhost                                     |
| **Hosting (Prod)** | Vercel (Frontend), Render/Railway (Backend)   |
| **Diseño**         | Figma, Illustrator/Canva                      |
| **QA**             | Postman, Google Sheets                        |
| **Datos**          | Excel/Google Sheets, Power BI / Looker Studio |

---

## 🎯 Roadmap de 8 Semanas

| Semana | Hito                   | Foco                                        |
| ------ | ---------------------- | ------------------------------------------- |
| 1      | **Equipo Alineado**    | Descubrimiento, moodboard, wireframes lo-fi |
| 2      | **UX/UI Aprobado**     | Manual de marca, prototipo Hi-Fi            |
| 3      | **Setup Completado**   | Repos listos, primeros endpoints            |
| 4      | **Avance Dev I**       | Login funcional, catálogo                   |
| 5      | **Avance Dev II**      | Carrito y checkout simulado                 |
| 6      | **Pre-Cierre Dev**     | Dashboard de impacto (feature freeze)       |
| 7      | **Estabilidad**        | Testing, bugs críticos, pixel-perfect       |
| 8      | **Proyecto Entregado** | Deploy a producción + presentación final    |

---

## 📈 Métricas de Éxito (MVP)

- ✅ Ciclo completo funcional: Registro → Catálogo → Checkout Simulado → CO2 visible
- ✅ Dashboard con datos matemáticamente exactos (auditado por QA)
- ✅ Deploy público accesible (no localhost)
- ✅ Sign-off de calidad (QA) antes del lanzamiento
- ✅ Código documentado y mantenible
- ✅ Presentación final ante stakeholders

---

## 🤝 Convenciones de Desarrollo

### Commits

```bash
# Feature nueva
git commit -m "feat: agregar dashboard de datos"

# Fix de bug
git commit -m "fix: corregir color del botón de checkout"

# Documentación
git commit -m "docs: actualizar README del backend"

# Refactor
git commit -m "refactor: reorganizar estructura de componentes"
```

### Ramas

```bash
git checkout -b feature/nombre-de-la-funcionalidad
git checkout -b fix/descripcion-del-bug
git checkout -b docs/actualizacion-readme
```

---

## 📞 Documentación Interna

- **Notion (Centro del Proyecto):** [Link a Notion](https://app.notion.com/p/3d521cf73aff8141b881d7d9be6ab99b)
- **Backlog completo:** [Tareas por semana](https://app.notion.com/p/e097645a3f284cf296e72f9fb4fe9233)
- **Matriz de riesgos:** [Riesgos detectados](https://app.notion.com/p/599491befb884640825bf4d7a7e266d9)
- **Minutas de reuniones:** [Historial de reuniones](https://app.notion.com/p/526c3997d71f47c4aed0276bb6936cb7)
- **Reportes semanales:** [Estado de la célula](https://app.notion.com/p/b3b752b16c8e4ee99436e61af22de9a)

---

## 📝 Licencia

Este proyecto es parte de una simulación educativa de Talently Lab. Uso interno del equipo S2601.

---

## ✨ Créditos

Desarrollado por el equipo S2601 durante la Cohorte de Talently Lab (2026).

---

**Última actualización:** 09/09/2026  
**Estado:** En desarrollo (Semana 1)
