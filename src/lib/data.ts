
import type { Zone, Site, Technician, Ticket, Notification, User, ScheduleEvent } from '@/lib/types';

export const users: User[] = [
  { id: 'user-1', name: 'Admin User', email: 'admin@gemelli.edu.co', avatar: 'https://placehold.co/100x100.png', role: 'admin' },
  { id: 'user-2', name: 'Tech User', email: 'tech@gemelli.edu.co', avatar: 'https://placehold.co/100x100.png', role: 'tech' },
  { id: 'user-3', name: 'Requester User', email: 'requester@gemelli.edu.co', avatar: 'https://placehold.co/100x100.png', role: 'requester' },
];

export const zones: Zone[] = [
  { id: 'zona-a', name: 'Bloque A - Aulas' },
  { id: 'zona-b', name: 'Bloque B - Laboratorios' },
  { id: 'zona-c', name: 'Áreas Administrativas' },
  { id: 'zona-d', name: 'Zonas Comunes' },
];

export const sites: Site[] = [
  { id: 'site-a1', name: 'Salón 101', zoneId: 'zona-a' },
  { id: 'site-a2', name: 'Salón 102', zoneId: 'zona-a' },
  { id: 'site-b1', name: 'Laboratorio de Química', zoneId: 'zona-b' },
  { id: 'site-b2', name: 'Laboratorio de Física', zoneId: 'zona-b' },
  { id: 'site-c1', name: 'Rectoría', zoneId: 'zona-c' },
  { id: 'site-c2', name: 'Secretaría Académica', zoneId: 'zona-c' },
  { id: 'site-d1', name: 'Cafetería', zoneId: 'zona-d' },
  { id: 'site-d2', name: 'Biblioteca', zoneId: 'zona-d' },
];

export const technicians: Technician[] = [
  { id: 'tech-1', name: 'Carlos Gomez', avatar: 'https://placehold.co/100x100.png', skills: ['Electricidad', 'Plomería'], workload: 85 },
  { id: 'tech-2', name: 'Lucia Fernandez', avatar: 'https://placehold.co/100x100.png', skills: ['HVAC', 'Carpintería'], workload: 60 },
  { id: 'tech-3', name: 'Pedro Ramirez', avatar: 'https://placehold.co/100x100.png', skills: ['Redes', 'Sistemas'], workload: 40 },
];

export const tickets: Ticket[] = [
  {
    id: '1',
    code: 'GEMMAN-ZONAA-SITEA1-0001',
    title: 'Proyector no enciende',
    description: 'El proyector del salón 101 no enciende. Se revisaron las conexiones y parece ser un problema interno.',
    zone: 'Bloque A - Aulas',
    site: 'Salón 101',
    priority: 'Alta',
    status: 'Asignado',
    createdAt: '2024-05-20T10:00:00Z',
    dueDate: '2024-05-21T10:00:00Z',
    assignedTo: 'Carlos Gomez',
    requester: 'Profesor Martinez',
  },
  {
    id: '2',
    code: 'GEMMAN-ZONAB-SITEB1-0002',
    title: 'Fuga en grifo de lavamanos',
    description: 'Hay una fuga constante en el grifo del lavamanos principal del laboratorio de química.',
    zone: 'Bloque B - Laboratorios',
    site: 'Laboratorio de Química',
    priority: 'Urgente',
    status: 'Abierto',
    createdAt: '2024-05-21T09:30:00Z',
    dueDate: '2024-05-21T21:30:00Z',
    requester: 'Dra. Isabela Rojas',
  },
  {
    id: '3',
    code: 'GEMMAN-ZONAC-SITEC2-0003',
    title: 'Impresora no funciona',
    description: 'La impresora de la secretaría académica no está respondiendo. Se necesita con urgencia para imprimir certificados.',
    zone: 'Áreas Administrativas',
    site: 'Secretaría Académica',
    priority: 'Media',
    status: 'En Progreso',
    createdAt: '2024-05-21T11:00:00Z',
    dueDate: '2024-05-23T11:00:00Z',
    assignedTo: 'Pedro Ramirez',
    requester: 'Ana María',
  },
  {
    id: '4',
    code: 'GEMMAN-ZONAD-SITED1-0004',
    title: 'Ajuste de puerta principal',
    description: 'La puerta principal de la cafetería no cierra correctamente y se queda abierta.',
    zone: 'Zonas Comunes',
    site: 'Cafetería',
    priority: 'Baja',
    status: 'Requiere Aprobación',
    createdAt: '2024-05-19T15:00:00Z',
    dueDate: '2024-05-22T15:00:00Z',
    assignedTo: 'Lucia Fernandez',
    requester: 'Admin Cafetería',
    attachments: [
      { url: 'https://placehold.co/400x300.png', description: 'Puerta ajustada y lubricada.' },
      { url: 'https://placehold.co/400x300.png', description: 'Cerradura funcionando OK.' },
    ]
  },
    {
    id: '5',
    code: 'GEMMAN-ZONAA-SITEA2-0005',
    title: 'Cambio de bombilla quemada',
    description: 'Una de las luces del techo del salón 102 está quemada y necesita ser reemplazada.',
    zone: 'Bloque A - Aulas',
    site: 'Salón 102',
    priority: 'Baja',
    status: 'Cerrado',
    createdAt: '2024-05-18T08:00:00Z',
    dueDate: '2024-05-21T08:00:00Z',
    assignedTo: 'Carlos Gomez',
    requester: 'Coordinador Académico',
    attachments: [
        { url: 'https://placehold.co/400x300.png', description: 'Nueva bombilla LED instalada.' },
    ]
  },
];

export const notifications: Notification[] = [
    { id: '1', title: 'Nuevo ticket asignado', description: 'Se te ha asignado el ticket GEMMAN-ZONAA-SITEA1-0001', createdAt: 'Hace 5 minutos', read: false, type: 'ticket' },
    { id: '2', title: 'SLA en Riesgo', description: 'El ticket GEMMAN-ZONAC-SITEC2-0003 está a punto de vencer.', createdAt: 'Hace 2 horas', read: false, type: 'sla' },
    { id: '3', title: 'Turno próximo', description: 'Tu turno de mantenimiento comienza en 60 minutos.', createdAt: 'Hace 1 día', read: true, type: 'schedule' },
    { id: '4', title: 'Ticket Resuelto', description: 'El ticket GEMMAN-ZONAD-SITED1-0004 ha sido resuelto.', createdAt: 'Hace 2 días', read: true, type: 'ticket' },
];

export const scheduleEvents: ScheduleEvent[] = [
    {
        id: 'evt-1',
        title: 'Turno Mañana',
        description: 'Ronda de inspección general',
        start: new Date('2024-05-20T08:00:00'),
        end: new Date('2024-05-20T12:00:00'),
        type: 'shift',
        technicianId: 'tech-1'
    },
    {
        id: 'evt-2',
        title: 'Ticket: GEMMAN-ZONAA-SITEA1-0001',
        description: 'Proyector no enciende',
        start: new Date('2024-05-20T13:00:00'),
        end: new Date('2024-05-20T15:00:00'),
        type: 'ticket',
        technicianId: 'tech-1',
        ticketId: '1'
    },
     {
        id: 'evt-3',
        title: 'Cuadrante Aseo: Bloque B',
        description: 'Limpieza profunda de laboratorios',
        start: new Date('2024-05-21T10:00:00'),
        end: new Date('2024-05-21T12:00:00'),
        type: 'task',
        technicianId: 'tech-2'
    },
     {
        id: 'evt-4',
        title: 'Ticket: GEMMAN-ZONAC-SITEC2-0003',
        description: 'Impresora no funciona',
        start: new Date('2024-05-22T11:00:00'),
        end: new Date('2024-05-22T13:00:00'),
        type: 'ticket',
        technicianId: 'tech-3',
        ticketId: '3'
    },
     {
        id: 'evt-5',
        title: 'Capacitación HVAC',
        description: 'Nuevos equipos y protocolos',
        start: new Date('2024-05-23T09:00:00'),
        end: new Date('2024-05-23T16:00:00'),
        type: 'shift',
        technicianId: 'tech-2'
    }
];

    