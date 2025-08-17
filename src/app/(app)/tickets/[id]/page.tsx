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
import { tickets, technicians } from '@/lib/data';
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
} from 'lucide-react';
import type { Ticket, Technician } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import AiSuggestion from './components/ai-suggestion';

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


export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const ticket = tickets.find((t) => t.id === params.id);

  if (!ticket) {
    notFound();
  }

  const assignedTechnician = technicians.find(
    (tech) => tech.name === ticket.assignedTo
  );

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>{ticket.code}</CardDescription>
                <CardTitle className="font-headline text-2xl mt-1">{ticket.title}</CardTitle>
              </div>
              <Badge variant={getPriorityBadgeVariant(ticket.priority)} className={`text-sm ${getPriorityBadgeClassName(ticket.priority)}`}>
                {ticket.priority}
              </Badge>
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
                    <Badge variant="secondary">{ticket.status}</Badge>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <strong>Creado:</strong>
                    <span>{new Date(ticket.createdAt).toLocaleString('es-CO')}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <strong>Vencimiento:</strong>
                    <span>{new Date(ticket.dueDate).toLocaleString('es-CO')}</span>
                </div>
            </div>
            <Separator />
             <div>
                <h3 className="font-semibold mb-2 text-primary flex items-center gap-2"><Paperclip className="w-4 h-4" /> Adjuntos</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> evidencia_1.jpg</Button>
                    <Button variant="outline" size="sm"><File className="w-4 h-4 mr-2"/> plano_area.pdf</Button>
                </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button><Edit className="w-4 h-4 mr-2" /> Actualizar Ticket</Button>
          </CardFooter>
        </Card>
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
          <CardFooter className="flex-col items-stretch space-y-2">
            <Button variant="outline">Reasignar Técnico</Button>
            <AiSuggestion ticket={ticket} />
          </CardFooter>
        </Card>

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
                            <p className="text-xs text-muted-foreground">{new Date(ticket.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                     <div className="flex gap-3">
                        <div className="flex-shrink-0"><ArrowRight className="w-5 h-5 text-blue-500" /></div>
                        <div>
                            <p>Ticket asignado a <strong>{ticket.assignedTo}</strong> por <strong>Admin</strong>.</p>
                            <p className="text-xs text-muted-foreground">{new Date(new Date(ticket.createdAt).getTime() + 3600000).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
