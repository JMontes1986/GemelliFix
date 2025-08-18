
'use client';

import { useState } from 'react';
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
import { tickets, technicians, users } from '@/lib/data';
import { notFound } from 'next/navigation';
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
} from 'lucide-react';
import type { Ticket, Technician } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AiSuggestion from './components/ai-suggestion';
import Image from 'next/image';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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
  const [currentTicket, setCurrentTicket] = useState(() => tickets.find((t) => t.id === params.id));
  const { toast } = useToast();
  
  if (!currentTicket) {
    notFound();
  }

  const [ticketStatus, setTicketStatus] = useState<Ticket['status']>(currentTicket.status);

  const assignedTechnician = technicians.find(
    (tech) => tech.name === currentTicket.assignedTo
  );

  const canEditStatus = currentUser.role === 'administrador' || currentUser.name === currentTicket.requester;
  const isRequester = currentUser.name === currentTicket.requester;
  
  const handleStatusChange = (newStatus: Ticket['status']) => {
    setTicketStatus(newStatus);
    // In a real app, you would also save this change to the database.
    // For now, we just update the local state.
    const updatedTicket = { ...currentTicket, status: newStatus };
    setCurrentTicket(updatedTicket);

    toast({
        title: "Estado Actualizado",
        description: `El estado del ticket ha sido cambiado a "${newStatus}".`,
    });
  }


  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>{currentTicket.code}</CardDescription>
                <CardTitle className="font-headline text-2xl mt-1">{currentTicket.title}</CardTitle>
              </div>
              <Badge variant={getPriorityBadgeVariant(currentTicket.priority)} className={`text-sm ${getPriorityBadgeClassName(currentTicket.priority)}`}>
                {currentTicket.priority}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-primary">Descripción</h3>
              <p className="text-muted-foreground">{currentTicket.description}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Zona:</strong>
                    <span>{currentTicket.zone}</span>
                </div>
                 <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <strong>Sitio:</strong>
                    <span>{currentTicket.site}</span>
                </div>
                <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <strong>Solicitante:</strong>
                    <span>{currentTicket.requester}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <strong>Estado:</strong>
                    {canEditStatus ? (
                        <Select value={ticketStatus} onValueChange={handleStatusChange}>
                            <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Cambiar estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Abierto">Abierto</SelectItem>
                                <SelectItem value="Asignado">Asignado</SelectItem>
                                <SelectItem value="En Progreso">En Progreso</SelectItem>
                                <SelectItem value="Requiere Aprobación">Requiere Aprobación</SelectItem>
                                <SelectItem value="Resuelto">Resuelto</SelectItem>
                                <SelectItem value="Cerrado">Cerrado</SelectItem>
                            </SelectContent>
                        </Select>
                    ) : (
                         <Badge variant={getStatusBadgeVariant(ticketStatus)} className={getStatusBadgeClassName(ticketStatus)}>{ticketStatus}</Badge>
                    )}
                   
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <strong>Creado:</strong>
                    <span><ClientFormattedDate date={currentTicket.createdAt} /></span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <strong>Vencimiento:</strong>
                    <span><ClientFormattedDate date={currentTicket.dueDate} /></span>
                </div>
            </div>
            <Separator />
             <div>
                <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Paperclip className="w-4 h-4" /> Adjuntos Iniciales</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> evidencia_1.jpg</Button>
                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> plano_area.pdf</Button>
                </div>
            </div>
          </CardContent>
        </Card>

        {currentTicket.attachments && currentTicket.attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-lg flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-500" /> Evidencia de Resolución</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {currentTicket.attachments.map((att, index) => (
                <div key={index} className="space-y-2">
                  <Image src={att.url} alt={att.description} width={400} height={300} className="rounded-md object-cover aspect-video" data-ai-hint="repair evidence"/>
                  <p className="text-sm text-muted-foreground italic">{att.description}</p>
                </div>
              ))}
            </CardContent>
            {isRequester && ticketStatus === 'Requiere Aprobación' && (
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
            <CardTitle className="font-headline text-lg">Técnico Asignado</CardTitle>
          </CardHeader>
          <CardContent>
            {assignedTechnician ? (
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
              <div className='text-muted-foreground'>Sin asignar</div>
            )}
          </CardContent>
          {!isRequester && (
            <CardFooter className="flex-col items-stretch space-y-2">
              <Button variant="outline">Reasignar Técnico</Button>
              <AiSuggestion ticket={currentTicket} />
            </CardFooter>
          )}
        </Card>

        {!isRequester && ['Asignado', 'En Progreso'].includes(ticketStatus) && (
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
                    <Button className="w-full">Marcar como Resuelto</Button>
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
                            <p>Ticket creado por <strong>{currentTicket.requester}</strong>.</p>
                            <p className="text-xs text-muted-foreground"><ClientFormattedDate date={currentTicket.createdAt} /></p>
                        </div>
                    </div>
                     <div className="flex gap-3">
                        <div className="flex-shrink-0"><ArrowRight className="w-5 h-5 text-blue-500" /></div>
                        <div>
                            <p>Ticket asignado a <strong>{currentTicket.assignedTo}</strong> por <strong>Admin</strong>.</p>
                            <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(currentTicket.createdAt).getTime() + 3600000)} /></p>
                        </div>
                    </div>
                     {currentTicket.status !== 'Abierto' && currentTicket.status !== 'Asignado' && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignedTechnician?.avatar} />
                                    <AvatarFallback>{assignedTechnician?.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <p><strong>{currentTicket.assignedTo}</strong>: "Iniciando diagnóstico del proyector. Parece un fallo en la fuente de poder."</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(currentTicket.createdAt).getTime() + 7200000)} /></p>
                            </div>
                        </div>
                     )}
                     {ticketStatus === 'Resuelto' || ticketStatus === 'Cerrado' || ticketStatus === 'Requiere Aprobación' && (
                         <div className="flex gap-3">
                            <div className="flex-shrink-0"><CheckCircle className="w-5 h-5 text-green-500" /></div>
                            <div>
                                <p>Ticket marcado como <strong>Resuelto</strong> por <strong>{currentTicket.assignedTo}</strong>.</p>
                                <p className="text-xs text-muted-foreground"><ClientFormattedDate date={new Date(new Date(currentTicket.dueDate).getTime() - 86400000)} /></p>
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
