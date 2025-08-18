

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Docentes' | 'Coordinadores' | 'Administrativos' | 'servicios generales' | 'administrador';
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

export type Attachment = {
    url: string;
    description: string;
}

export type Ticket = {
  id: string;
  code: string;
  title: string;
  description: string;
  zone: string;
  site: string;
  category: 'Electricidad' | 'Plomería' | 'HVAC' | 'Sistemas' | 'Infraestructura' | 'General';
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  status: 'Abierto' | 'Asignado' | 'En Progreso' | 'Requiere Aprobación' | 'Resuelto' | 'Cerrado';
  createdAt: string;
  dueDate: string;
  assignedTo?: string;
  requester: string;
  attachments?: Attachment[];
};

export type Technician = {
  id: string;
  name: string;
  avatar: string;
  skills: string[];
  workload: number;
  color: string;
};

export type Notification = {
  id:string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  type: 'ticket' | 'sla' | 'schedule';
};

export type ScheduleEvent = {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  type: 'shift' | 'ticket' | 'task';
  technicianId?: string;
  ticketId?: string;
};

    

    
