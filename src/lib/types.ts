export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'tech' | 'requester';
};

export type Zone = {
  id: string;
  name: string;
};

export type Site = {
  id: string;
  name: string;
  zoneId: string;
};

export type Ticket = {
  id: string;
  code: string;
  title: string;
  description: string;
  zone: string;
  site: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  status: 'Abierto' | 'Asignado' | 'En Progreso' | 'Resuelto' | 'Cerrado';
  createdAt: string;
  dueDate: string;
  assignedTo?: string;
  requester: string;
};

export type Technician = {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  type: 'ticket' | 'sla' | 'schedule';
};

export type ScheduleEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'shift' | 'ticket' | 'task';
  technicianId?: string;
  ticketId?: string;
};
