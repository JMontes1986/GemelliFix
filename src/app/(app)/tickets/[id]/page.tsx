
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, updateDoc, collection, addDoc, serverTimestamp, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
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
import { categories } from '@/lib/data';
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
  Users,
  Download,
} from 'lucide-react';
import type { Ticket, User as CurrentUser } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AiSuggestion from './components/ai-suggestion';
import AiStateSuggestion from './components/ai-state-suggestion';
import Image from 'next/image';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { onAuthStateChanged } from 'firebase/auth';
import { createLog } from '@/lib/utils';
import Link from 'next/link';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import PdfViewer from '@/components/ui/pdf-viewer';


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
}

async function createNotification(ticket: Ticket, assignedPersonnelIds: string[]) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("id", "in", assignedPersonnelIds));
        const querySnapshot = await getDocs(q);

        const notificationPromises = querySnapshot.docs.map(userDoc => {
            const userData = userDoc.data();
            const newNotification = {
                userId: userData.id,
                title: 'Nuevo Ticket Asignado',
                description: `Se te ha asignado el ticket: "${ticket.title}" (${ticket.code})`,
                createdAt: serverTimestamp(),
                read: false,
                type: 'ticket' as const,
                linkTo: `/tickets/${ticket.id}`,
            };
            return addDoc(collection(db, "notifications"), newNotification);
        });

        await Promise.all(notificationPromises);
    } catch (error) {
        console.error("Error creating notifications:", error);
    }
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [technicians, setTechnicians] = useState<CurrentUser[]>([]);


   useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const techData: CurrentUser[] = [];
        querySnapshot.forEach((doc) => {
            techData.push({ id: doc.id, ...doc.data() } as CurrentUser);
        });
        setTechnicians(techData);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
                setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as CurrentUser);
            }
        }
    });
    return () => unsubscribe();
  }, []);

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
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
            const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();
            const resolvedAt = data.resolvedAt?.toDate ? data.resolvedAt.toDate().toISOString() : undefined;
            
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
                createdAt,
                dueDate,
                resolvedAt,
                assignedTo: data.assignedTo || [],
                requester: data.requester,
                requesterId: data.requesterId,
                assignedToIds: data.assignedToIds || [],
                attachments: data.attachments || [],
                evidence: data.evidence || [],
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


  const canEdit = currentUser?.role === 'Administrador';

  const handleUpdate = async (field: keyof Ticket, value: any) => {
    if (!ticket || !currentUser) return;
    setIsUpdating(true);
    const docRef = doc(db, "tickets", ticket.id);
    const oldValue = ticket[field];
    let updates: { [key: string]: any } = { [field]: value };
    let logDetails: any = { ticket, oldValue, newValue: value };

    if (field === 'priority') {
        const createdAt = new Date(ticket.createdAt);
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
  }
  
   const handleAssignPersonnel = async (personnel: CurrentUser[]) => {
    if(!ticket || !currentUser) return;

    const oldValue = ticket.assignedTo || [];

    const personnelIds = personnel.map(p => p.id);
    const personnelNames = personnel.map(p => p.name);
    
    await handleUpdate('assignedToIds', personnelIds);
    await handleUpdate('assignedTo', personnelNames);
    const newStatus = personnelIds.length > 0 ? 'Asignado' : 'Abierto';
    await handleUpdate('status', newStatus);

    await createLog(currentUser, 'update_assignment', { ticket, oldValue, newValue: personnelNames });
    
    await createNotification(ticket, personnelIds);
    toast({
        title: "Personal Asignado",
        description: `El ticket ha sido actualizado y se ha notificado al personal.`,
    });
  }

  const handleApproval = async (approve: boolean) => {
    if (!ticket) return;
    const newStatus = approve ? 'Cerrado' : 'Asignado'; // If rejected, it goes back to 'Assigned'
    await handleUpdate('status', newStatus);
  };


  if (isLoading || !currentUser) {
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
  
  const assignedPersonnelDetails = technicians.filter(
    (tech) => ticket.assignedToIds?.includes(tech.id)
  );
  const isRequester = currentUser.id === ticket.requesterId;
  

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
                                    <SelectItem value="Cancelado">Cancelado</SelectItem>
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

        {ticket.evidence && ticket.evidence.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Evidencia de Resolución</CardTitle>
            </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ticket.evidence.map((att, index) => {
                    const isPdf = att.url.toLowerCase().includes('.pdf');
                    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(att.url);
                    
                    return (
                        <Card key={index} className="overflow-hidden">
                            <CardContent className="p-0">
                                {isImage ? (
                                    <Image src={att.url} alt={att.description} width={400} height={300} className="w-full h-auto object-cover aspect-video" data-ai-hint="repair evidence"/>
                                ) : (
                                    <div className="aspect-video bg-muted flex flex-col items-center justify-center p-4">
                                        <File className={cn("w-12 h-12", isPdf ? "text-red-500" : "text-muted-foreground")}/>
                                        <p className="mt-2 text-center text-sm text-muted-foreground">{att.description}</p>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="p-2 bg-background/50">
                                {isPdf ? (
                                     <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="secondary" className="w-full">
                                                <File className="mr-2 h-4 w-4" />
                                                Ver PDF
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-4xl h-[90vh]">
                                           <PdfViewer fileUrl={att.url} fileName={att.description} />
                                        </DialogContent>
                                    </Dialog>
                                ) : (
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-full">
                                        <Button variant="secondary" className="w-full">
                                            <Download className="mr-2 h-4 w-4" />
                                            Descargar/Ver
                                        </Button>
                                    </a>
                                )}
                            </CardFooter>
                        </Card>
                    )
                })}
            </CardContent>
            {isRequester && ticket.status === 'Requiere Aprobación' && (
              <CardFooter className="gap-4">
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApproval(true)} disabled={isUpdating}><ThumbsUp /> Aprobar y Cerrar Ticket</Button>
                <Button variant="destructive" className="w-full" onClick={() => handleApproval(false)} disabled={isUpdating}><ThumbsDown /> Rechazar Solución</Button>
              </CardFooter>
            )}
          </Card>
        )}

      </div>
      <div>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2"><Users className="w-5 h-5" />Personal Asignado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isUpdating && <div className="flex justify-center"><Loader2 className="animate-spin" /></div>}
            {!isUpdating && assignedPersonnelDetails.length > 0 ? (
                assignedPersonnelDetails.map(person => (
                    <div key={person.id} className="flex items-center gap-4">
                        <Avatar className="h-12 w-12">
                        <AvatarImage src={person.avatar} />
                        <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                        <h4 className="font-semibold">{person.name}</h4>
                        </div>
                    </div>
                ))
            ) : (
              !isUpdating && <div className='text-sm text-muted-foreground'>Sin asignar</div>
            )}
          </CardContent>
          {canEdit && (
            <CardFooter>
               <AiSuggestion 
                ticket={ticket} 
                technicians={technicians}
                assignedPersonnelDetails={assignedPersonnelDetails}
                onAssign={handleAssignPersonnel} 
              />
            </CardFooter>
          )}
        </Card>

        {assignedPersonnelDetails.length > 0 && ['Asignado', 'En Progreso'].includes(ticket.status) && (
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
                     {assignedPersonnelDetails.length > 0 && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0"><ArrowRight className="w-5 h-5 text-blue-500" /></div>
                            <div>
                                <p>Ticket asignado a <strong>{assignedPersonnelDetails.map(p => p.name).join(', ')}</strong> por <strong>Admin User</strong>.</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.createdAt).getTime() + 3600000).toISOString()} /></p>
                            </div>
                        </div>
                     )}
                     {ticket.status !== 'Abierto' && ticket.status !== 'Asignado' && assignedPersonnelDetails.length > 0 && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignedPersonnelDetails[0].avatar} />
                                    <AvatarFallback>{assignedPersonnelDetails[0].name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <p><strong>{assignedPersonnelDetails[0].name}</strong>: "Iniciando diagnóstico del proyector. Parece un fallo en la fuente de poder."</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.createdAt).getTime() + 7200000).toISOString()} /></p>
                            </div>
                        </div>
                     )}
                     {(ticket.status === 'Resuelto' || ticket.status === 'Cerrado' || ticket.status === 'Requiere Aprobación') && assignedPersonnelDetails.length > 0 && (
                         <div className="flex gap-3">
                            <div className="flex-shrink-0"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                            <div>
                                <p>Ticket marcado como <strong>Resuelto</strong> por <strong>{ticket.assignedTo?.[0] || ''}</strong>.</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(ticket.dueDate).getTime() - 86400000).toISOString()} /></p>
                            </div>
                        </div>
                     )}
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
