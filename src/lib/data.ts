
import type { Zone, Site, Ticket, Notification, User, ScheduleEvent, Category } from '@/lib/types';

export const users: User[] = [
  { id: 'user-1', uid:'user-1', name: 'Admin User', email: 'sistemas@colgemelli.edu.co', avatar: 'https://firebasestorage.googleapis.com/v0/b/gemellifix.firebasestorage.app/o/Logo.png?alt=media&token=3c91d664-c1d3-43b0-b81f-2b21a7cf2c05', role: 'Administrador' },
  { id: 'user-2', uid:'user-2', name: 'Mantenimiento User', email: 'mantenimiento@colgemelli.edu.co', avatar: 'https://placehold.co/100x100.png', role: 'Servicios Generales' },
  { id: 'user-3', uid:'user-3', name: 'Requester User', email: 'requester@gemelli.edu.co', avatar: 'https://placehold.co/100x100.png', role: 'Docentes' },
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

export const categories: Category[] = [
    { id: 'cat-1', name: 'Limpieza de baños' },
    { id: 'cat-2', name: 'Limpieza de salones' },
    { id: 'cat-3', name: 'Limpieza de comedor y cafetería' },
    { id: 'cat-4', name: 'Limpieza de oficinas y administrativos' },
    { id: 'cat-5', name: 'Limpieza de pasillos y hall' },
    { id: 'cat-6', name: 'Recolección y basuras' },
    { id: 'cat-7', name: 'Mantenimiento de infraestructura' },
    { id: 'cat-8', name: 'Zonas verdes y exteriores' },
    { id: 'cat-9', name: 'Apoyo logístico y varios' },
    { id: 'cat-10', name: 'Otros' },
];


export const tickets: Ticket[] = [];

export const notifications: Notification[] = [
    { id: '1', userId: 'user-2', title: 'Nuevo ticket asignado', description: 'Se te ha asignado el ticket GEMMAN-ZONAA-SITEA1-0001', createdAt: new Date(), read: false, type: 'ticket', linkTo: '/tickets/1' },
    { id: '2', userId: 'user-1', title: 'SLA en Riesgo', description: 'El ticket GEMMAN-ZONAC-SITEC2-0003 está a punto de vencer.', createdAt: new Date(), read: false, type: 'sla', linkTo: '/tickets/3' },
    { id: '3', userId: 'user-2', title: 'Turno próximo', description: 'Tu turno de mantenimiento comienza en 60 minutos.', createdAt: new Date(), read: true, type: 'schedule', linkTo: '/calendar' },
    { id: '4', userId: 'user-3', title: 'Ticket Resuelto', description: 'El ticket GEMMAN-ZONAD-SITED1-0004 ha sido resuelto.', createdAt: new Date(), read: true, type: 'ticket', linkTo: '/tickets/4' },
];

export const scheduleEvents: ScheduleEvent[] = [
    {
        id: 'evt-1',
        title: 'Turno Mañana',
        description: 'Ronda de inspección general',
        start: new Date('2024-08-19T08:00:00'),
        end: new Date('2024-08-19T12:00:00'),
        type: 'shift',
        technicianId: 'user-2'
    },
    {
        id: 'evt-2',
        title: 'Ticket: GEMMAN-ZONAA-SITEA1-0001',
        description: 'Proyector no enciende',
        start: new Date('2024-08-20T13:00:00'),
        end: new Date('2024-08-20T15:00:00'),
        type: 'ticket',
        technicianId: 'user-2',
        ticketId: '1'
    },
];
