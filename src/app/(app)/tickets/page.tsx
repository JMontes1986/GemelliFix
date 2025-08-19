

'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import { File, ListFilter, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { Ticket, User } from '@/lib/types';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createLog } from '@/lib/utils';


const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Media': return 'secondary';
    case 'Baja': return 'outline';
    default: return 'default';
  }
};

const getStatusBadgeVariant = (status: Ticket['status']) => {
  switch (status) {
    case 'Abierto': return 'destructive';
    case 'Asignado': return 'default';
    case 'En Progreso': return 'default';
    case 'Requiere Aprobación': return 'default';
    case 'Resuelto': return 'default';
    case 'Cerrado': return 'secondary';
    case 'Cancelado': return 'secondary';
    default: return 'default';
  }
};

const getStatusBadgeClassName = (status: Ticket['status']) => {
    switch (status) {
      case 'Asignado': return 'bg-blue-500 text-white';
      case 'En Progreso': return 'bg-yellow-500 text-black';
      case 'Requiere Aprobación': return 'bg-purple-500 text-white';
      case 'Resuelto': return 'bg-green-600 text-white';
      case 'Cancelado': return 'bg-gray-400 text-black';
      default: return '';
    }
};

const getPriorityBadgeClassName = (priority: Ticket['priority']) => {
    switch(priority) {
        case 'Alta': return 'bg-orange-500 text-white';
        case 'Media': return 'bg-yellow-400 text-black';
        default: return '';
    }
};

interface TicketsTableProps {
    tickets: Ticket[];
    isLoading: boolean;
    error: string | null;
    isUpdating: boolean;
    currentUser: User | null;
    technicians: User[];
    handleUpdate: (ticketId: string, field: keyof Ticket, value: any) => void;
    handleAssign: (ticketId: string, technician: User) => void;
}

const TicketsTable: React.FC<TicketsTableProps> = ({
    tickets,
    isLoading,
    error,
    isUpdating,
    currentUser,
    technicians,
    handleUpdate,
    handleAssign,
}) => {
    const router = useRouter();
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="space-y-2 w-full">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="h-24 text-center text-red-500 flex items-center justify-center">{error}</div>;
    }

    if (tickets.length === 0) {
        return <div className="h-24 text-center flex items-center justify-center">No hay solicitudes en este estado.</div>;
    }

    const groupedTickets = tickets.reduce((acc, ticket) => {
        const { zone } = ticket;
        if (!acc[zone]) {
            acc[zone] = [];
        }
        acc[zone].push(ticket);
        return acc;
    }, {} as Record<string, Ticket[]>);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='w-[180px]'>Código Ticket</TableHead>
                    <TableHead>Sitio</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Asignado a</TableHead>
                    <TableHead className="hidden md:table-cell">Creado</TableHead>
                    <TableHead className="hidden md:table-cell">Vence</TableHead>
                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {Object.entries(groupedTickets).map(([zone, ticketsInZone]) => (
                    <React.Fragment key={zone}>
                        <TableRow className="bg-muted/50">
                            <TableCell colSpan={9} className="font-bold font-headline text-primary">{zone}</TableCell>
                        </TableRow>
                        {ticketsInZone.map((ticket) => (
                            <TableRow key={ticket.id}>
                                <TableCell className="font-medium">
                                    <Link href={`/tickets/${ticket.id}`} className="text-primary hover:underline">{ticket.code}</Link>
                                </TableCell>
                                <TableCell>{ticket.site}</TableCell>
                                <TableCell>{ticket.title}</TableCell>
                                <TableCell>
                                    {currentUser?.role === 'Administrador' ? (
                                        <Select value={ticket.priority} onValueChange={(value) => handleUpdate(ticket.id, 'priority', value)} disabled={isUpdating}>
                                            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Prioridad" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Baja">Baja</SelectItem>
                                                <SelectItem value="Media">Media</SelectItem>
                                                <SelectItem value="Alta">Alta</SelectItem>
                                                <SelectItem value="Urgente">Urgente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={getPriorityBadgeVariant(ticket.priority)} className={getPriorityBadgeClassName(ticket.priority)}>{ticket.priority}</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {currentUser?.role === 'Administrador' ? (
                                        <Select value={ticket.status} onValueChange={(value) => handleUpdate(ticket.id, 'status', value)} disabled={isUpdating}>
                                            <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Estado" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Abierto">Abierto</SelectItem>
                                                <SelectItem value="Asignado">Asignado</SelectItem>
                                                <SelectItem value="Requiere Aprobación">Requiere Aprobación</SelectItem>
                                                <SelectItem value="En Progreso">En Progreso</SelectItem>
                                                <SelectItem value="Resuelto">Resuelto</SelectItem>
                                                <SelectItem value="Cancelado">Cancelado</SelectItem>
                                                <SelectItem value="Cerrado">Cerrado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Badge variant={getStatusBadgeVariant(ticket.status)} className={getStatusBadgeClassName(ticket.status)}>{ticket.status}</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {currentUser?.role === 'Administrador' ? (
                                        <Select
                                            value={ticket.assignedToIds?.[0] || ''}
                                            onValueChange={(value) => {
                                                const tech = technicians.find(t => t.id === value);
                                                if (tech) handleAssign(ticket.id, tech);
                                            }}
                                            disabled={isUpdating}
                                        >
                                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                                <SelectValue placeholder="Sin Asignar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {technicians.map(tech => (
                                                    <SelectItem key={tech.id} value={tech.id}>{tech.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        (Array.isArray(ticket.assignedTo) && ticket.assignedTo.length > 0) ? ticket.assignedTo.join(', ') : 'Sin Asignar'
                                    )}
                                </TableCell>
                                <TableCell className="hidden md:table-cell"><ClientFormattedDate date={ticket.createdAt} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} /></TableCell>
                                <TableCell className="hidden md:table-cell"><ClientFormattedDate date={ticket.dueDate} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} /></TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /><span className="sr-only">Toggle menu</span></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                              <Link href={`/tickets/${ticket.id}`}>Ver Detalles</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/tickets/${ticket.id}`)}>
                                              Asignar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
            </TableBody>
        </Table>
    );
};


export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const { toast } = useToast();
  
  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
                } else {
                   setError("Usuario no encontrado en la base de datos.");
                   setIsLoading(false);
                }
            } catch (err) {
                 setError("Error al cargar datos del usuario.");
                 setIsLoading(false);
            }
        } else {
            setIsLoading(false);
        }
    });
    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!currentUser) {
        if (!auth.currentUser) setIsLoading(false);
        return;
    }

    if (currentUser.role === 'Administrador') {
        const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
        const unsubscribeTechs = onSnapshot(techQuery, (snapshot) => {
            const techData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setTechnicians(techData);
        });
        // Remember to unsubscribe
    }
    
    let q;
    if (currentUser.role === 'Administrador') {
        q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    } else if (currentUser.role === 'Servicios Generales') {
        q = query(collection(db, 'tickets'), where('assignedToIds', 'array-contains', currentUser.id), orderBy('createdAt', 'desc'));
    } else if (['Docentes', 'Coordinadores', 'Administrativos'].includes(currentUser.role)) {
        q = query(collection(db, 'tickets'), where('requesterId', '==', currentUser.id), orderBy('createdAt', 'desc'));
    } else {
        setTickets([]);
        setIsLoading(false);
        return;
    }
    
    const unsubscribeTickets = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
          const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();
          return { 
              id: doc.id,
              ...data,
              createdAt,
              dueDate,
          } as Ticket;
      });
      setTickets(ticketsData);
      setIsLoading(false);
      setError(null);
    }, (err) => {
      console.error("Error fetching tickets: ", err);
      setError("No se pudieron cargar las solicitudes. Por favor, revisa la conexión y los permisos de Firestore.");
      setIsLoading(false);
    });

    return () => unsubscribeTickets();
  }, [currentUser]);

  const handleUpdate = async (ticketId: string, field: keyof Ticket, value: any) => {
    if (!currentUser) return;
  
    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el ticket." });
        return;
    }

    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticketId);
    const oldValue = ticketToUpdate[field];
    let updates: { [key: string]: any } = { [field]: value };
    let logDetails: any = { ticket: ticketToUpdate, oldValue, newValue: value };

    if (field === 'priority') {
        const createdAt = new Date(ticketToUpdate.createdAt);
        let newDueDate = new Date(createdAt);

        switch(value) {
            case 'Urgente': newDueDate.setHours(createdAt.getHours() + 12); break;
            case 'Alta': newDueDate.setHours(createdAt.getHours() + 24); break;
            case 'Media': newDueDate.setHours(createdAt.getHours() + 36); break;
            case 'Baja': newDueDate.setHours(createdAt.getHours() + 48); break;
        }
        updates.dueDate = newDueDate;
        logDetails.newValue = `${value} (vence: ${newDueDate.toLocaleDateString()})`;
    }

    try {
      await updateDoc(docRef, updates);

      if (field === 'status' || field === 'priority') {
          await createLog(currentUser, `update_${field}`, logDetails);
      }

      toast({
        title: "Ticket Actualizado",
        description: `El campo ${field} ha sido cambiado.`,
      });
    } catch (error: any) {
      console.error("Error updating ticket: ", error);
      toast({
        variant: "destructive",
        title: "Error al Actualizar",
        description: `No se pudo actualizar el ticket. ${error.message}`,
      });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleAssign = async (ticketId: string, technician: User) => {
    if (!currentUser) return;

    const ticketToUpdate = tickets.find(t => t.id === ticketId);
    if (!ticketToUpdate) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo encontrar el ticket." });
        return;
    }

    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticketId);
    const oldValue = ticketToUpdate.assignedTo || [];
    const newValue = [technician.name];

    try {
        await updateDoc(docRef, {
            assignedTo: newValue,
            assignedToIds: [technician.id],
            status: 'Asignado',
        });

        await createLog(currentUser, 'update_assignment', { ticket: ticketToUpdate, oldValue: oldValue.join(', '), newValue: newValue.join(', ') });
        
        toast({
            title: "Ticket Asignado",
            description: `El ticket ha sido asignado a ${technician.name}.`
        });
    } catch (error: any) {
        console.error("Error assigning ticket: ", error);
        toast({
            variant: "destructive",
            title: "Error al Asignar",
            description: `No se pudo asignar el ticket. ${error.message}`,
        });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const statuses: Ticket['status'][] = ['Abierto', 'Asignado', 'Requiere Aprobación', 'En Progreso', 'Resuelto', 'Cancelado', 'Cerrado'];
  const filteredTickets = (status: Ticket['status']) => tickets.filter(t => t.status === status);

  return (
    <Tabs defaultValue="all" className="space-y-4">
      <div className="flex items-center">
        <TabsList className="overflow-x-auto h-auto p-1">
          <TabsTrigger value="all">Todos</TabsTrigger>
           {statuses.map(status => (
                <TabsTrigger key={status} value={status}>{status}</TabsTrigger>
            ))}
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 gap-1"><ListFilter className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Filtro</span></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel><DropdownMenuSeparator /><DropdownMenuItem>Zona</DropdownMenuItem><DropdownMenuItem>Prioridad</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 gap-1"><File className="h-3.5 w-3.5" /><span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Exportar</span></Button>
        </div>
      </div>
       <Card>
          <CardHeader>
            <CardTitle className='font-headline'>Solicitudes de Mantenimiento</CardTitle>
            <CardDescription>Gestiona y monitorea todas las solicitudes.</CardDescription>
          </CardHeader>
          <CardContent>
            <TabsContent value="all">
                <TicketsTable tickets={tickets} isLoading={isLoading} error={error} isUpdating={isUpdating} currentUser={currentUser} technicians={technicians} handleUpdate={handleUpdate} handleAssign={handleAssign} />
            </TabsContent>
            {statuses.map(status => (
                <TabsContent key={status} value={status}>
                    <TicketsTable tickets={filteredTickets(status)} isLoading={isLoading} error={error} isUpdating={isUpdating} currentUser={currentUser} technicians={technicians} handleUpdate={handleUpdate} handleAssign={handleAssign} />
                </TabsContent>
            ))}
          </CardContent>
      </Card>
    </Tabs>
  );
}
