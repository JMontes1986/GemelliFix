# **App Name**: GemelliFix

## Core Features:

- Authentication and Roles: User authentication with different roles (admin, tech, requester) using Firebase Auth. Self-service profile registration upon first login.
- Ticket Submission: Creation of maintenance requests with zone, site, description, type, priority, and attachments. Generation of a unique ID for each ticket following the pattern GEMMAN-{ZONA}-{SITIO}-{NNNN}.
- Ticket Assignment and SLAs: Assignment of tickets to maintenance personnel with SLAs based on priority. Automated alerts (FCM + email) for pending or overdue tickets.
- Scheduling with Drag and Drop: Operative calendar (week/month view) for leaders to schedule maintenance personnel shifts and drag & drop tickets to technicians/slots. Manage recurring schedules, calculate workload, and avoid over-allocation using intelligent tool.
- Cleaning Quadrants: Module for defining cleaning zones/sites with recurring tasks (checklists), confirmation of completion, and evidence uploads. Integration with the operative calendar.
- Leader Dashboard: Dashboard displaying key performance indicators (KPIs) such as open/overdue tickets, MTTA/MTTR, SLA compliance, etc. Quick actions for ticket creation and shift scheduling.
- Data Importer: Import zones and sites and assign them to responsible technicians based on the provided Excel files, facilitating an efficient setup and technician rostering.
- Reglas de Seguridad (bosquejo): Solo `admin` puede:Crear/editar zonas y sitios, cambiar prioridades, reasignar roles, ver todo.
- `requester`: `requester`:Crear tickets, leer/editar **solo** los suyos (hasta estado `asignado`; después solo puede comentar).
- `tech`: `tech`:Leer tickets **asignados** o de su zona; cambiar `status` (no cerrar definitivamente), subir evidencias.
- Notificaciones: Notificaciones: **FCM** + correo:- Nuevo ticket (para `admin` y zona responsable).- Ticket asignado (para `tech`).- Cambio de estado.- SLA en riesgo (T-20%) y **SLA vencido**.- Recordatorio de turno/recurrente (T-60 min).
- Cloud Functions (clave): **onCreate(ticket)**: genera `code`, calcula `sla.dueAt` según `priority`, notifica (FCM + email).
- **onUpdate(ticket)**: **onUpdate(ticket)**: si cambia `status` o `priority`, recalcular SLA y notificar.
- **Scheduler**: **Scheduler** (pub/sub cada 10 min): marcar **breached** y enviar alertas si `now > sla.dueAt && !resolved`.
- **onCreate(schedule)**: **onCreate(schedule)**: expandir recurrencias (próximas 8–12 semanas) en “instancias” virtuales o calcular on-the-fly.
- **Carga de trabajo**: **Carga de trabajo**: función que calcule % ocupación por técnico (tickets activos + turnos + cuadrantes) y sugiera asignaciones.
- Centro de notificaciones en la app con filtro por tipo y estado “leído”.: Centro de notificaciones en la app con filtro por tipo y estado “leído”.
- UI/UX: UI/UX: Layout de 3 vistas principales según rol:1. **Solicitudes** (lista, filtros por estado/zona/sitio/prioridad/SLA; creación y detalle con timeline).2. **Calendario** (semana/mes, drag & drop de tickets y tareas; recurrencias).3. **Dashboard** (solo `admin`).
- Componentes: Componentes: DataGrid con **agrupación por Zona → Sitio**, chips de estado/SLA, carga de adjuntos con preview, barra de búsqueda global.
- Temas: Temas:- Primario **#1C448E**, acentos **#FFE74C**, fondo **#FFFFFF**, tipografía legible.- Botones primaria/amarilla; gráficos monocromos con acento amarillo para alertas
- Datos iniciales (seed): Datos iniciales (seed): **Zonas** y **Sitios** deben precargarse a partir de los **Cuadrantes de Aseo** institucionales (oficinas, pasillos, baños, laboratorios, etc.), para que el `requester` seleccione con precisión; incluye frecuencias (p. ej., baños 4 veces al día, pasillos diarios) como plantillas de tareas recurrentes.
- Permitir **importar**: Permitir **importar**: Permitir **importar** los Excel entregados (bitácora y programación semanal) para bootstrap del sistema (migración mínima).
- Reportes y Exportación: Reportes y Exportación: Exportar a **Excel/PDF**: bitácora, tickets por rango de fechas, cumplimiento SLA, ocupación por técnico, ranking de zonas/sitios, checklist de cuadrantes con evidencias.
- Accesibilidad, Auditoría y Cumplimiento: Accesibilidad, Auditoría y Cumplimiento: Registro de auditoría por cambios sensibles (prioridad, reasignación, cierre).
- Tiempos: Tiempos: Tiempos en **America/Bogota**; soporte 12/24h.
- Textos: Textos: Textos de interfaz en **español**; mensajes claros y breves.
- Historias de Usuario (resumen): Historias de Usuario (resumen): *Como docente*, creo una solicitud con fotos y recibo notificaciones hasta el cierre.*Como técnico*, veo mis tickets/agenda, marco avances, subo evidencias y cierro con informe.*Como líder*, priorizo, asigno, programo turnos/aseo, vigilo SLA y analizo el dashboard.
- Validaciones: Validaciones: Validaciones:- `priority` editable solo por `admin`.- Adjuntos: tamaño máx. 10 MB; tipos (`image/*`, `application/pdf`, `video/mp4` opcional).- Escrituras actualizan `updatedAt` con **serverTimestamp`.
- Criterios de Aceptación (clave): Criterios de Aceptación (clave): Criterios de Aceptación (clave)- ID de ticket cumple regex: `^GEMMAN-[A-Z0-9]+-[A-Z0-9]+-\d{4}$`.- SLAs 12/24/36/48 configurables y alertas funcionando (riesgo y vencido).- Calendario con recurrencias y drag & drop activo.- Dashboard muestra KPIs y top zonas/sitios; exporta datos.- Seguridad: cada rol solo ve/edita lo permitido; adjuntos protegidos.- Importación desde Excel/CSV para zonas, sitios, cuadrantes y programación.
- Storage rules: Storage rules: Storage rules: carpeta por ticket, acceso restringido por rol y pertenencia.

## Style Guidelines:

- Primary color: Deep blue (#1C448E), embodying the Colegio Franciscano Agustín Gemelli’s brand identity and lending a sense of stability.
- Background color: Very light blue (#F0F4F9). Slightly desaturated, and visually very close to white, which allows elements styled in the primary color to strongly stand out.
- Accent color: Bright yellow (#FFE74C), injecting a vibrant contrast that emphasizes interactive elements and draws attention to important alerts or calls to action.
- Body and headline font: **Montserrat (títulos y dashboard)** + **Roboto o Nunito Sans (textos y formularios)**.
- Use clear and concise icons for representing different ticket types, priorities, and actions. Icons should be consistent and adhere to accessibility guidelines.
- Implement a responsive layout with distinct views for each user role: 'Solicitudes' for requesters, 'Calendario' for leaders, and 'Dashboard' for administrators. Employ a DataGrid for tabular data presentation with grouping by Zona → Site.
- Incorporate subtle transitions and animations to enhance the user experience, such as loading indicators, feedback upon form submission, and smooth navigation between views. Ensure animations do not cause motion sickness or distract from essential content.