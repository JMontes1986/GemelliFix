
# 🛠️ GemelliFix: Sistema Inteligente de Gestión de Mantenimiento

<p align="center">
  <img src="https://firebasestorage.googleapis.com/v0/b/gemellifix.firebasestorage.app/o/Logo.png?alt=media&token=3c91d664-c1d3-43b0-b81f-2b21a7cf2c05" width="200" alt="GemelliFix Logo"/>
</p>

<p align="center">
  <b>Gestión integral de mantenimiento, optimizada con Inteligencia Artificial para el Colegio Franciscano Agustín Gemelli</b>
</p>

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar servidor de desarrollo
npm run dev
```

👉 Luego visita: [http://localhost:9002](http://localhost:9002)

---

## 🔒 Supabase y Seguridad de Datos

Este proyecto utiliza [Supabase](https://supabase.com) para ciertas operaciones de backend.

- Las tablas están protegidas mediante **Row Level Security (RLS)**. Ejemplos de políticas se incluyen en `supabase/policies.sql`.
- Para tareas administrativas desde el servidor, configura la variable `SUPABASE_SERVICE_ROLE_KEY` y evita exponerla en el cliente.
- En el navegador solo debe usarse `NEXT_PUBLIC_SUPABASE_ANON_KEY` con permisos limitados.

---

## 🏛️ Arquitectura del Sistema

### Roles de Usuario
```mermaid
graph TD
    subgraph "Roles de Usuario"
        A(Administrador)
        B(Servicios Generales)
        C(SST - Auditor)
        D(Solicitantes)
    end

    subgraph "Acciones"
        Accion1[Ver Dashboard & Tickets Globales]
        Accion2[CRUD Completo de Tickets]
        Accion3[Gestión de Configuración y Usuarios]
        Accion4[Ver Tickets Asignados]
        Accion5[Actualizar Progreso y Subir Evidencia]
        Accion6[Crear Tickets]
        Accion7[Ver Historial de Tickets Propios]
        Accion8[Crear y Gestionar Requisiciones]
        Accion9[Gestionar Calendario Operativo]
    end

    A --> Accion1 & Accion2 & Accion3 & Accion8 & Accion9
    B --> Accion4 & Accion5 & Accion9
    C --> Accion1
    D --> Accion6 & Accion7
```

### Ciclo de Vida de un Ticket
```mermaid
stateDiagram-v2
    [*] --> Abierto: Ticket creado
    Abierto --> Asignado: Admin asigna técnico
    Asignado --> EnProgreso: Técnico actualiza estado
    EnProgreso --> RequiereAprobacion: Técnico sube evidencia
    RequiereAprobacion --> Cerrado: Admin aprueba solución
    RequiereAprobacion --> Asignado: Admin rechaza / pide corrección
    Cerrado --> [*]
```

---

## 🤖 Molly IA: Inteligencia Artificial Integrada

El sistema está potenciado por **Molly IA**, un conjunto de asistentes inteligentes diseñados para optimizar cada paso del proceso de mantenimiento.

```mermaid
mindmap
  root((Molly IA))
    (Asistente de Creación 📝)
      - Sugiere Título a partir de la descripción
      - Sugiere Categoría y Prioridad según el contexto
    (Asistente de Asignación 👷)
      - Recomienda el mejor técnico basado en carga y disponibilidad
      - Sugiere la franja horaria óptima en el calendario
    (Asistente de Operaciones 📊)
      - Analiza los KPIs del Dashboard y genera un resumen ejecutivo
      - Detecta tickets vencidos y recomienda los próximos pasos
    (Asistente de Diagnóstico ⚙️)
      - Ayuda a solucionar problemas de conexión con Firebase
      - Diagnostica errores de permisos y falta de índices en Firestore
    (Asistente de Ayuda General 💬)
      - Responde preguntas de los usuarios sobre cómo usar la aplicación
```

---
## 📋 Módulos Principales

-   **Dashboard**: Vista de pájaro de toda la operación. Ofrece métricas clave (KPIs) como cumplimiento de SLA, tiempos de resolución, tickets vencidos y gráficos interactivos sobre zonas, categorías y productividad del equipo. Los usuarios no administradores ven una versión simplificada con sus propias estadísticas.
-   **Solicitudes (Tickets)**: El corazón del sistema. Permite la creación, visualización, asignación y seguimiento de todas las incidencias. Incluye un historial detallado, sistema de comentarios y gestión de archivos adjuntos y evidencias.
-   **Requisiciones**: Módulo para la gestión de solicitudes de compra de materiales o servicios necesarios para el mantenimiento. Permite crear, aprobar y seguir el estado de cada ítem.
-   **Calendario Operativo**: Herramienta visual para programar turnos y asignar tareas al personal de Servicios Generales. Permite la creación de eventos recurrentes y asignaciones inteligentes sugeridas por la IA.
-   **Configuración**: Panel de control para el Administrador. Permite gestionar usuarios (crear, editar roles), zonas, sitios y categorías que alimentan los formularios del sistema.
-   **Diagnóstico**: Página técnica para el Administrador que permite ejecutar pruebas de conectividad con Firebase, verificar reglas de seguridad y permisos de usuario, y obtener diagnósticos de la IA para solucionar problemas comunes.

---

## 👥 Roles en Detalle

-   **Administrador 👑**
    -   Control total sobre todos los módulos.
    -   Gestiona usuarios, zonas, sitios, categorías y requisiciones.
    -   Asigna tickets, aprueba soluciones y tiene acceso a todas las métricas.
    -   Utiliza el módulo de **Diagnóstico** para la salud del sistema.

-   **Servicios Generales 🛠️**
    -   El equipo técnico que resuelve las incidencias.
    -   Visualiza y actualiza únicamente los tickets que se le han asignado.
    -   Sube evidencia fotográfica del trabajo realizado.
    -   Puede ver su propia agenda en el **Calendario**.

-   **SST (Auditoría) 🔍**
    -   Rol de solo lectura para supervisión y auditoría.
    -   Tiene acceso completo al **Dashboard** y puede ver todos los tickets, pero no puede realizar modificaciones.

-   **Solicitantes (Docentes, Coordinadores, etc.) ✏️**
    -   Crean nuevas solicitudes de mantenimiento (tickets).
    -   Pueden ver el estado y el historial de sus propias solicitudes únicamente.
    -   Responden la encuesta de satisfacción una vez que su ticket es cerrado.

---

## 🛠️ Stack Tecnológico

-   **Framework**: Next.js 15 + App Router
-   **Lenguaje**: TypeScript
-   **UI**: Tailwind CSS + shadcn/ui
-   **Backend & DB**: Firebase (Firestore, Authentication, Storage)
-   **Inteligencia Artificial**: Genkit (Google AI - Gemini)
-   **Cloud Functions**: Automatización de lógica de negocio y notificaciones.

---

<p align="center">
  Hecho con ❤️ para la comunidad educativa del Colegio Franciscano Agustín Gemelli
</p>
