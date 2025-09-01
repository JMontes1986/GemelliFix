

export type User = {
  id: string;
  uid: string;
  name: string;
  email: string;
  avatar: string;
  role: 'Administrador' | 'Servicios Generales' | 'Docentes' | 'Coordinadores' | 'Administrativos' | 'SST';
  createdAt?: any;
  ticketsResolved?: number;
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
  description:string;
  zone: string;
  site: string;
  category: string;
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  status: 'Abierto' | 'Asignado' | 'Requiere Aprobación' | 'En Progreso' | 'Resuelto' | 'Cerrado' | 'Cancelado';
  createdAt: string;
  dueDate: string;
  resolvedAt?: string;
  assignedTo?: string[];
  assignedToIds?: string[];
  requester: string;
  requesterId: string;
  attachments?: Attachment[];
  evidence?: Attachment[];
  statusHistory?: {
    [key in Ticket['status']]?: string;
  };
  satisfactionRating?: number;
  satisfactionComment?: string;
  satisfactionSurveyCompleted?: boolean;
  pendingTask?: string; // Tarea pendiente al cerrar
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
  recurrenceId?: string;
};

export type RequisitionItem = {
    quantity: number;
    product: string;
    description: string;
}

export type Requisition = {
  id: string;
  requisitionNumber: string; // e.g., REQ-2024-001
  requesterName: string;
  requesterId: string;
  requesterPosition: string; // Cargo
  department: string; // Dependencia
  requestDate: any;
  items: RequisitionItem[];
  attachments: Attachment[];
  createdAt: any;
};


export type Log = {
    id: string;
    userEmail: string;
    userName: string;
    action: 'login' | 'create_ticket' | 'update_status' | 'update_priority' | 'update_assignment' | 'add_comment' | 'close_with_task';
    timestamp: any;
    details: {
        ticketId?: string;
        ticketCode?: string;
        field?: 'status' | 'priority' | 'assignedTo';
        oldValue?: any;
        newValue?: any;
        comment?: string;
        requisitionId?: string;
        pendingTask?: string;
    }
}
    

    

    
    

    
