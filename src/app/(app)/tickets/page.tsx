
'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, onSnapshot, query, where, orderBy, doc, updateDoc } from 'firebase/firestore';
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

export default function TicketsPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const { toast } = useToast();
  const router = useRouter();

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
            // No user is signed in.
            setIsLoading(false);
        }
    });

    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!currentUser) {
        // Wait for user to be loaded
        if (!auth.currentUser) setIsLoading(false); // If no auth at all, stop loading.
        return;
    }
    
    let q;
    if (currentUser.role === 'Servicios Generales') {
        // Filter tickets for 'Servicios Generales'
        q = query(
            collection(db, 'tickets'), 
            where('assignedToIds', 'array-contains', currentUser.id),
            orderBy('createdAt', 'desc')
        );
    } else if (['Docentes', 'Coordinadores', 'Administrativos'].includes(currentUser.role)) {
        q = query(
            collection(db, 'tickets'),
            where('requesterId', '==', currentUser.id),
            orderBy('createdAt', 'desc')
        );
    }
    else {
        // Admins and other roles see all tickets
        q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
    }
    
    const unsubscribeTickets = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ticketsData.push({
          id: doc.id,
          code: data.code,
          title: data.title,
          description: data.description,
          zone: data.zone,
          site: data.site,
          category: data.category,
          priority: data.priority,
          status: data.status,
          createdAt: data.createdAt?.toDate().toISOString() ?? new Date().toISOString(),
          dueDate: data.dueDate?.toDate().toISOString() ?? new Date().toISOString(),
          assignedTo: data.assignedTo || [],
          requester: data.requester,
          requesterId: data.requesterId,
          assignedToIds: data.assignedToIds || [],
        });
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

  const groupedTickets = tickets.reduce((acc, ticket) => {
    const { zone } = ticket;
    if (!acc[zone]) {
      acc[zone] = [];
    }
    acc[zone].push(ticket);
    return acc;
  }, {} as Record<string, Ticket[]>);

   const handleUpdate = async (ticketId: string, field: keyof Ticket, value: any) => {
    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticketId);
    try {
      await updateDoc(docRef, { [field]: value });
      toast({
        title: "Ticket Actualizado",
        description: `El campo ha sido cambiado.`,
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


  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="abierto">Abiertos</TabsTrigger>
          <TabsTrigger value="en_progreso">En Progreso</TabsTrigger>
          <TabsTrigger value="resuelto" className="hidden sm:flex">
            Resueltos
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filtro
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Zona</DropdownMenuItem>
              <DropdownMenuItem>Prioridad</DropdownMenuItem>
              <DropdownMenuItem>Estado</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle className='font-headline'>Solicitudes de Mantenimiento</CardTitle>
            <CardDescription>
              Gestiona y monitorea todas las solicitudes.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                       <div className="flex justify-center items-center">
                          <div className="space-y-2 w-full">
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                       </div>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                   <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-red-500">
                        {error}
                    </TableCell>
                  </TableRow>
                ) : tickets.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                            No hay solicitudes de mantenimiento registradas.
                        </TableCell>
                    </TableRow>
                ) : (
                    Object.entries(groupedTickets).map(([zone, ticketsInZone]) => (
                    <React.Fragment key={zone}>
                        <TableRow className="bg-muted/50">
                        <TableCell colSpan={9} className="font-bold font-headline text-primary">
                            {zone}
                        </TableCell>
                        </TableRow>
                        {ticketsInZone.map((ticket) => (
                        <TableRow key={ticket.id}>
                            <TableCell className="font-medium">
                            <Link href={`/tickets/${ticket.id}`} className="text-primary hover:underline">
                                {ticket.code}
                            </Link>
                            </TableCell>
                            <TableCell>{ticket.site}</TableCell>
                            <TableCell>{ticket.title}</TableCell>
                            <TableCell>
                                {currentUser?.role === 'Administrador' ? (
                                    <Select 
                                        value={ticket.priority} 
                                        onValueChange={(value) => handleUpdate(ticket.id, 'priority', value)}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger className="w-[120px] h-8 text-xs">
                                            <SelectValue placeholder="Prioridad" />
                                        </SelectTrigger>
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
                                    <Select 
                                        value={ticket.status} 
                                        onValueChange={(value) => handleUpdate(ticket.id, 'status', value)}
                                        disabled={isUpdating}
                                    >
                                        <SelectTrigger className="w-[150px] h-8 text-xs">
                                            <SelectValue placeholder="Estado" />
                                        </SelectTrigger>
                                        <SelectContent>
                                             <SelectItem value="Abierto">Abierto</SelectItem>
                                             <SelectItem value="Asignado">Asignado</SelectItem>
                                             <SelectItem value="En Progreso">En Progreso</SelectItem>
                                             <SelectItem value="Requiere Aprobación">Requiere Aprobación</SelectItem>
                                             <SelectItem value="Resuelto">Resuelto</SelectItem>
                                             <SelectItem value="Cancelado">Cancelado</SelectItem>
                                             <SelectItem value="Cerrado">Cerrado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Badge variant={getStatusBadgeVariant(ticket.status)} className={getStatusBadgeClassName(ticket.status)}>{ticket.status}</Badge>
                                )}
                            </TableCell>
                            <TableCell>{(Array.isArray(ticket.assignedTo) && ticket.assignedTo.length > 0) ? ticket.assignedTo.join(', ') : 'Sin Asignar'}</TableCell>
                            <TableCell className="hidden md:table-cell">
                            <ClientFormattedDate date={ticket.createdAt} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                            <ClientFormattedDate date={ticket.dueDate} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                            </TableCell>
                            <TableCell>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button
                                    aria-haspopup="true"
                                    size="icon"
                                    variant="ghost"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                <DropdownMenuItem asChild><Link href={`/tickets/${ticket.id}`}>Ver Detalles</Link></DropdownMenuItem>
                                <DropdownMenuItem onClick={() => router.push(`/tickets/${ticket.id}`)}>Asignar</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            </TableCell>
                        </TableRow>
                        ))}
                    </React.Fragment>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
