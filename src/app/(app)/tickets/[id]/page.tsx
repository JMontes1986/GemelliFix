
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { technicians, users, categories } from '@/lib/data';
import {
  File,
  User,
  Clock,
  Calendar,
  Tag,
  MapPin,
  MessageSquare,
  Paperclip,
  CheckCircle,
  Edit,
  ArrowRight,
  Camera,
  ThumbsUp,
  ThumbsDown,
  Briefcase,
  Loader2,
  Sparkles,
} from 'lucide-react';
import type { Ticket, Technician } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AiSuggestion from './components/ai-suggestion';
import AiStateSuggestion from './components/ai-state-suggestion';
import Image from 'next/image';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';


const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default';
    case 'Media': return 'secondary';
    case 'Baja': return 'outline';
    default: return 'default';
  }
};

const getPriorityBadgeClassName = (priority: Ticket['priority']) => {
    switch(priority) {
        case 'Alta': return 'bg-orange-500 text-white';
        case 'Media': return 'bg-yellow-400 text-black';
        default: return '';
    }
}

const getStatusBadgeVariant = (status: Ticket['status']) => {
  switch (status) {
    case 'Abierto': return 'destructive';
    case 'Asignado': return 'default';
    case 'En Progreso': return 'default';
    case 'Requiere Aprobación': return 'default';
    case 'Resuelto': return 'default';
    case 'Cerrado': return 'secondary';
    default: return 'default';
  }
};

const getStatusBadgeClassName = (status: Ticket['status']) => {
    switch (status) {
      case 'Asignado': return 'bg-blue-500 text-white';
      case 'En Progreso': return 'bg-yellow-500 text-black';
      case 'Requiere Aprobación': return 'bg-purple-500 text-white';
      case 'Resuelto': return 'bg-green-600 text-white';
      default: return '';
    }
}

// Hardcoded current user for permission checking
const currentUser = users[0];

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const ticketId = params.id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!ticketId) {
        setError("No se proporcionó un ID de ticket.");
        setIsLoading(false);
        return;
    }

    const docRef = doc(db, "tickets", ticketId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const ticketData: Ticket = {
                id: docSnap.id,
                code: data.code,
                title: data.title,
                description: data.description,
                zone: data.zone,
                site: data.site,
                category: data.category,
                priority: data.priority,
                status: data.status,
                createdAt: data.createdAt?.toDate().toISOString(),
                dueDate: data.dueDate?.toDate().toISOString(),
                assignedTo: data.assignedTo,
                requester: data.requester,
                attachments: data.attachments || [],
            };
            setTicket(ticketData);
        } else {
            setError("No se pudo encontrar el ticket especificado.");
        }
        setIsLoading(false);
    }, (err) => {
        console.error("Error fetching ticket:", err);
        setError("Error al cargar el ticket. Verifique su conexión y permisos.");
        setIsLoading(false);
    });

    return () => unsubscribe();
}, [ticketId]);


  const canEdit = currentUser.role === 'Administrador';

  const handleUpdate = async (field: keyof Ticket, value: any) => {
    if (!ticket) return;
    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticket.id);
    try {
      await updateDoc(docRef, { [field]: value });
      toast({
        title: "Ticket Actualizado",
        description: `El campo ${field} ha sido cambiado a "${value}".`,
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
  }
  
   const handleAssignTechnician = async (technician: Technician) => {
    if (!ticket) return;
    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticket.id);
    try {
      await updateDoc(docRef, { 
          assignedTo: technician.name,
          status: 'Asignado' 
      });
      toast({
        title: "Personal Asignado",
        description: `El ticket ha sido asignado a ${technician.name}.`,
      });
    } catch (error: any) {
       console.error("Error assigning technician: ", error);
      toast({
        variant: "destructive",
        title: "Error al Asignar",
        description: `No se pudo asignar el personal. ${error.message}`,
      });
    } finally {
        setIsUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
            <Card>
                <CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-20 w-full" />
                </CardContent>
            </Card>
        </div>
        <div>
            <Card><CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent></Card>
        </div>
      </div>
    )
  }

  if (error) {
    return <Card><CardHeader><CardTitle>Error</CardTitle></CardHeader><CardContent><p className="text-red-500">{error}</p></CardContent></Card>
  }
  
  if (!ticket) {
     return <Card><CardHeader><CardTitle>Ticket no encontrado</CardTitle></CardHeader><CardContent><p>El ticket que buscas no existe o ha sido eliminado.</p></CardContent></Card>
  }
  
  const assignedTechnician = technicians.find(
    (tech) => tech.name === ticket.assignedTo
  );
  const isRequester = currentUser.name === ticket.requester;


  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>{ticket.code}</CardDescription>
                <CardTitle className="font-headline text-2xl mt-1">{ticket.title}</CardTitle>
              </div>
              {canEdit ? (
                <Select value={ticket.priority} onValueChange={(value) => handleUpdate('priority', value)} disabled={isUpdating}>
                    <SelectTrigger className="w-[180px] h-9 text-sm">
                        <SelectValue placeholder="Cambiar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Baja">Baja</SelectItem>
                        <SelectItem value="Media">Media</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                    </SelectContent>
                </Select>
              ) : (
                <Badge variant={getPriorityBadgeVariant(ticket.priority)} className={`text-sm ${getPriorityBadgeClassName(ticket.priority)}`}>
                    {ticket.priority}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-primary">Descripción</h3>
              <p className="text-muted-foreground">{ticket.description}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Zona:</strong>
                    <span>{ticket.zone}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Sitio:</strong>
                    <span>{ticket.site}</span>
                </div>
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <strong>Solicitante:</strong>
                    <span>{ticket.requester}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <strong>Estado:</strong>
                     <div className="flex items-center gap-1">
                        {(canEdit || isRequester) ? (
                            <Select value={ticket.status} onValueChange={(value) => handleUpdate('status', value)} disabled={isUpdating}>
                                <SelectTrigger className="w-[150px] h-8 text-xs">
                                    <SelectValue placeholder="Cambiar estado" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Abierto">Abierto</SelectItem>
                                    <SelectItem value="Asignado">Asignado</SelectItem>
                                    <SelectItem value="En Progreso">En Progreso</SelectItem>
                                    {isRequester && <SelectItem value="Requiere Aprobación">Requiere Aprobación</SelectItem>}
                                    <SelectItem value="Resuelto">Resuelto</SelectItem>
                                    <SelectItem value="Cerrado">Cerrado</SelectItem>
                                </SelectContent>
                            </Select>
                        ) : (
                             <Badge variant={getStatusBadgeVariant(ticket.status)} className={getStatusBadgeClassName(ticket.status)}>{ticket.status}</Badge>
                        )}
                         {canEdit && <AiStateSuggestion ticket={ticket} onStatusChange={(newStatus) => handleUpdate('status', newStatus)} />}
                    </div>
                   
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <strong>Creado:</strong>
                    <span><ClientFormattedDate date={ticket.createdAt} /></span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <strong>Vencimiento:</strong>
                    <span><ClientFormattedDate date={ticket.dueDate} /></span>
                </div>
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <strong>Categoría:</strong>
                     {canEdit ? (
                        <Select value={ticket.category} onValueChange={(value) => handleUpdate('category', value)} disabled={isUpdating}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Cambiar categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    ) : (
                        <span>{ticket.category}</span>
                    )}
                </div>
            </div>
             {ticket.attachments && ticket.attachments.length > 0 && (
                <>
                    <Separator />
                    <div>
                        <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Paperclip className="w-4 h-4" /> Adjuntos Iniciales</h3>
                        <div className="flex flex-wrap gap-2">
                            {ticket.attachments.map((file, index) => (
                                <a key={index} href={file.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> {file.description}</Button>
                                </a>
                            ))}
                        </div>
                    </div>
                </>
             )}
          </CardContent>
        </Card>

        {ticket.attachments && ticket.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Evidencia de Resolución</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {ticket.attachments.map((att, index) => (
                <div key={index} className="space-y-2">
                  <Image src={att.url} alt={att.description} width={400} height={300} className="rounded-md object-cover aspect-video" data-ai-hint="repair evidence"/>
                  <p className="text-sm text-muted-foreground italic">{att.description}</p>
                </div>
              ))}
            </CardContent>
            {isRequester && ticket.status === 'Requiere Aprobación' && (
              <CardFooter className="gap-4">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white"><ThumbsUp /> Aprobar y Cerrar Ticket</Button>
                <Button variant="destructive" className="w-full"><ThumbsDown /> Rechazar Solución</Button>
              </CardFooter>
            )}
          </Card>
        )}

      </div>
      <div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-headline text-lg">Personal Asignado</CardTitle>
          </CardHeader>
          <CardContent>
            {isUpdating && <Loader2 className="animate-spin" />}
            {!isUpdating && assignedTechnician ? (
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={assignedTechnician.avatar} />
                  <AvatarFallback>{assignedTechnician.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h4 className="font-semibold">{assignedTechnician.name}</h4>
                  <p className="text-sm text-muted-foreground">{assignedTechnician.skills.join(', ')}</p>
                </div>
              </div>
            ) : (
              !isUpdating && <div className='text-muted-foreground'>Sin asignar</div>
            )}
          </CardContent>
          {canEdit && (
            <CardFooter className="flex-col items-stretch space-y-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" disabled={isUpdating}>
                      {assignedTechnician ? 'Reasignar Personal' : 'Asignar Personal'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {technicians.map(tech => (
                        <DropdownMenuItem key={tech.id} onClick={() => handleAssignTechnician(tech)} disabled={isUpdating}>
                            {tech.name}
                        </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

              <AiSuggestion ticket={ticket} onAssign={handleAssignTechnician} />
            </CardFooter>
          )}
        </Card>

        {assignedTechnician && ['Asignado', 'En Progreso'].includes(ticket.status) && (
            <Card className="mb-6">
                 <CardHeader>
                    <CardTitle className="font-headline text-lg flex items-center gap-2"><Edit className="w-5 h-5" /> Actualizar Progreso</CardTitle>
                </CardHeader>
                 <CardContent>
                    <div className="space-y-4">
                         <div>
                            <label htmlFor="comment" className="text-sm font-medium">Agregar Comentario</label>
                            <textarea id="comment" placeholder="Describe el trabajo realizado..." className="mt-1 block w-full rounded-md border-input bg-background p-2 text-sm shadow-sm focus:border-ring focus:ring focus:ring-ring focus:ring-opacity-50"></textarea>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Adjuntar Evidencia Fotográfica</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <Camera className="mx-auto h-12 w-12 text-muted-foreground" />
                                    <div className="flex text-sm text-muted-foreground">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                                            <span>Sube un archivo</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple />
                                        </label>
                                        <p className="pl-1">o arrastra y suelta</p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF hasta 10MB</p>
                                </div>
                            </div>
                        </div>
                    </div>
                 </CardContent>
                 <CardFooter>
                    <Button className="w-full" onClick={() => handleUpdate('status', 'Resuelto')}>Marcar como Resuelto</Button>
                 </CardFooter>
            </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="font-headline text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" /> Historial y Comentarios</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                        <div>
                            <p>Ticket creado por <strong>{ticket.requester}</strong>.</p>
                            <p className="text-xs text-muted-foreground"><ClientFormattedDate date={ticket.createdAt} /></p>
                        </div>
                    </div>
                     {assignedTechnician && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0"><ArrowRight className="w-5 h-5 text-blue-500" /></div>
                            <div>
                                <p>Ticket asignado a <strong>{assignedTechnician.name}</strong> por <strong>Admin User</strong>.</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.createdAt).getTime() + 3600000)} /></p>
                            </div>
                        </div>
                     )}
                     {ticket.status !== 'Abierto' && ticket.status !== 'Asignado' && assignedTechnician && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignedTechnician.avatar} />
                                    <AvatarFallback>{assignedTechnician.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <p><strong>{assignedTechnician.name}</strong>: "Iniciando diagnóstico del proyector. Parece un fallo en la fuente de poder."</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.createdAt).getTime() + 7200000)} /></p>
                            </div>
                        </div>
                     )}
                     {(ticket.status === 'Resuelto' || ticket.status === 'Cerrado' || ticket.status === 'Requiere Aprobación') && (
                         <div className="flex gap-3">
                            <div className="flex-shrink-0"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                            <div>
                                <p>Ticket marcado como <strong>Resuelto</strong> por <strong>{ticket.assignedTo}</strong>.</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.dueDate).getTime() - 86400000)} /></p>
                            </div>
                        </div>
                     )}
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
    

    



    

    