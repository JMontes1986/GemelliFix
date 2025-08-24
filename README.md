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
# Instalar dependencias
npm install

# Ejecutar servidor de desarrollo
npm run dev
```

👉 Luego visita: [http://localhost:9002](http://localhost:9002)

---

## 📊 Arquitectura del Sistema

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
        Accion1[Dashboard & Tickets Globales]
        Accion2[CRUD de Tickets]
        Accion3[Gestión de Configuración]
        Accion4[Ver Tickets Asignados]
        Accion5[Actualizar Progreso + Evidencias]
        Accion6[Crear Tickets]
        Accion7[Ver Tickets Propios]
    end

    A --> Accion1 & Accion2 & Accion3
    B --> Accion4 & Accion5
    C --> Accion1
    D --> Accion6 & Accion7
```

### Ciclo de Vida de un Ticket
```mermaid
stateDiagram-v2
    [*] --> Abierto: Ticket creado
    Abierto --> Asignado: Admin asigna técnico
    Asignado --> EnProgreso: Técnico inicia
    EnProgreso --> RequiereAprobacion: Evidencia subida
    RequiereAprobacion --> Cerrado: Admin aprueba
    RequiereAprobacion --> Asignado: Rechazo / corrección
    Abierto --> Cancelado
    Asignado --> Cancelado
    Cerrado --> [*]
    Cancelado --> [*]
```

---

## 🤖 Molly IA: Inteligencia Artificial Integrada

```mermaid
mindmap
  root((Molly IA))
    (Asistente General 🤖)
      - Preguntas sobre la app
    (Sugerencias de Ticket 💡)
      - Categoría & Prioridad
    (Asignación Inteligente 👷)
      - Recomendación de técnico
    (Asistente de Estado ✨)
      - Detecta vencidos / próximo paso
    (Calendario Asistido 📅)
      - Optimización de horarios
    (Dashboard Inteligente 📊)
      - Resumen ejecutivo de KPIs
    (Autodiagnóstico 🔧)
      - Detecta errores y sugiere fixes
```

---

## 👥 Roles en Detalle

- **Administrador 👑**
  - Control total: usuarios, zonas, tickets, categorías.
  - Acceso a **Dashboard**, **Calendario** y **Diagnóstico**.

- **Servicios Generales 🛠️**
  - Técnicos que resuelven incidencias.
  - Solo ven y actualizan tickets asignados.

- **SST (Auditoría) 🔍**
  - Rol de lectura: visualiza Dashboard y tickets.

- **Solicitantes ✏️**
  - Docentes, coordinadores y administrativos.
  - Crean tickets y revisan solo los propios.

---

## ✨ Funcionalidades Principales

- 🎫 **Gestión de Tickets:** CRUD + historial y comentarios.  
- 📅 **Calendario Operativo:** turnos, tareas y drag & drop.  
- 📊 **Dashboard de KPIs:** cumplimiento de SLA, tickets vencidos, tiempos medios.  
- 👥 **Gestión de Usuarios y Datos Maestros.**  
- 🔔 **Centro de Notificaciones.**

---

## 🛠️ Stack Tecnológico

- **Framework:** Next.js 15 + App Router  
- **Lenguaje:** TypeScript  
- **UI:** Tailwind + shadcn/ui  
- **Backend & DB:** Firebase (Firestore, Auth, Storage)  
- **IA:** Genkit (Google AI)  
- **Cloud Functions:** automatización de lógica y alertas  

---

## 🌟 Screenshots (pendiente incluir)

- 📊 Dashboard con métricas SLA.  
- 📅 Calendario con asignaciones.  
- 🎫 Flujo de creación de ticket con Molly IA.  

---

<p align="center">
  Hecho con ❤️ para la comunidad educativa del Colegio Franciscano Agustín Gemelli
</p>
