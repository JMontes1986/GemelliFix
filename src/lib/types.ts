

export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Docentes' | 'Coordinadores' | 'Administrativos' | 'Servicios Generales' | 'Administrador';
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

export type Category = {
  id: string;
  name: string;
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
  category: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  status: 'Abierto' | 'Asignado' | 'En Progreso' | 'Requiere Aprobación' | 'Resuelto' | 'Cerrado' | 'Cancelado';
  createdAt: string;
  dueDate: string;
  resolvedAt?: string;
  assignedTo?: string[];
  assignedToIds?: string[];
  requester: string;
  requesterId: string;
  attachments?: Attachment[];
  evidence?: Attachment[];
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
  userId: string;
  title: string;
  description: string;
  createdAt: any;
  read: boolean;
  type: 'ticket' | 'sla' | 'schedule';
  linkTo: string;
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

export type Log = {
    id: string;
    userEmail: string;
    userName: string;
    action: 'login' | 'update_status' | 'update_priority' | 'update_assignment';
    timestamp: any;
    details: {
        ticketId?: string;
        ticketCode?: string;
        field?: 'status' | 'priority' | 'assignedTo';
        oldValue?: any;
        newValue?: any;
        description?: string;
    }
}
    

    

    
