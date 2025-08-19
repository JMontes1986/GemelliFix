
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { technicians as allTechnicians, scheduleEvents, tickets as unassignedTicketsData } from '@/lib/data';
import type { Technician, ScheduleEvent, Ticket, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { suggestCalendarAssignment, type SuggestCalendarAssignmentInput, type SuggestCalendarAssignmentOutput } from '@/ai/flows/suggest-calendar-assignment';
import { Skeleton } from '@/components/ui/skeleton';


const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const technician = allTechnicians.find(t => t.id === event.technicianId);
  const eventDate = new Date(event.start);
  
  const startHour = eventDate.getHours();
  const startMinutes = eventDate.getMinutes();
  const endHour = event.end.getHours();
  const endMinutes = event.end.getMinutes();

  const totalStartMinutes = (startHour - 8) * 60 + startMinutes;
  const totalEndMinutes = (endHour - 8) * 60 + endMinutes;
  const durationMinutes = totalEndMinutes - totalStartMinutes;

  // Each hour slot is 64px (h-16) high
  const top = (totalStartMinutes / 60) * 64; 
  const height = (durationMinutes / 60) * 64;

  return (
    <div
      className={cn(
        'absolute w-full p-2 rounded-lg border text-xs shadow-sm cursor-pointer hover:shadow-md transition-all z-10',
        technician?.color || 'bg-secondary text-secondary-foreground'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
    >
      <p className="font-bold truncate">{event.title}</p>
      <p className="truncate opacity-80">{event.description}</p>
    </div>
  );
};


const UnassignedTicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div
      className="p-2 rounded-lg border border-dashed bg-card text-card-foreground mb-2 cursor-grab"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("ticketId", ticket.id);
      }}
    >
      <p className="font-semibold text-sm">{ticket.code}</p>
      <p className="text-xs text-muted-foreground">{ticket.title}</p>
    </div>
);

function AiAssignmentDialog({ 
    isOpen, 
    onOpenChange, 
    suggestion, 
    isLoading,
    onConfirm
}: { 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    suggestion: SuggestCalendarAssignmentOutput | null, 
    isLoading: boolean,
    onConfirm: (suggestion: SuggestCalendarAssignmentOutput) => void
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Sugerencia de Programación por IA
                    </DialogTitle>
                    <DialogDescription>
                        El asistente de IA ha analizado el ticket y los horarios para encontrar la mejor opción.
                    </DialogDescription>
                </DialogHeader>
                {isLoading && (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full mt-2" />
                    </div>
                )}
                {suggestion && (
                  <div className="space-y-4 py-4">
                        <div>
                            <h3 className="font-semibold text-primary">Sugerencia:</h3>
                            <p className="text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                            <p><strong>Ticket:</strong> {suggestion.ticket.title}</p>
                            <p><strong>Personal:</strong> {suggestion.technician.name}</p>
                            <p><strong>Fecha y Hora:</strong> {new Date(suggestion.suggestedTime).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</p>
                        </div>
                        <Button className="w-full" onClick={() => onConfirm(suggestion)}>
                            Confirmar y Crear Evento
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date('2025-05-19'));
    const [events, setEvents] = useState<ScheduleEvent[]>(scheduleEvents);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>(unassignedTicketsData.filter(t => !t.assignedTo));
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestCalendarAssignmentOutput | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
                    }
                } catch (error) {
                     console.error("Error fetching user data:", error);
                }
            }
            setIsLoadingUser(false);
        });

        return () => unsubscribe();
    }, []);

    const technicians = currentUser?.role === 'Servicios Generales' 
        ? allTechnicians.filter(t => t.name === currentUser.name)
        : allTechnicians;

    const handleDrop = async (technicianId: string, day: Date, time: string, draggedTicketId: string) => {
        const ticket = unassignedTickets.find(t => t.id === draggedTicketId);
        if (!ticket) return;

        const [hour] = time.split(':');
        const targetDate = new Date(day);
        targetDate.setHours(parseInt(hour, 10));
        
        setIsAiDialogOpen(true);
        setIsLoadingAi(true);
        setAiSuggestion(null);

        const input: SuggestCalendarAssignmentInput = {
            ticket: { id: ticket.id, title: ticket.title, description: ticket.description, category: ticket.category },
            targetDate: targetDate.toISOString(),
            targetTechnicianId: technicianId,
        };

        try {
            const result = await suggestCalendarAssignment(input);
            setAiSuggestion(result);
        } catch (error) {
            console.error("Error getting AI suggestion:", error);
            toast({
                variant: 'destructive',
                title: 'Error de IA',
                description: 'No se pudo obtener la sugerencia del asistente de IA.',
            });
            setIsAiDialogOpen(false);
        } finally {
            setIsLoadingAi(false);
        }
    };

    const handleConfirmAssignment = (suggestion: SuggestCalendarAssignmentOutput) => {
        const { ticket, technician, suggestedTime } = suggestion;
        
        const newEvent: ScheduleEvent = {
            id: `evt-${Date.now()}`,
            title: `Ticket: ${ticket.title}`,
            description: ticket.description,
            start: new Date(suggestedTime),
            end: new Date(new Date(suggestedTime).getTime() + 2 * 60 * 60 * 1000), // Assume 2 hour duration
            type: 'ticket',
            technicianId: technician.id,
            ticketId: ticket.id
        };

        setEvents(prev => [...prev, newEvent]);
        setUnassignedTickets(prev => prev.filter(t => t.id !== ticket.id));

        toast({
            title: '¡Evento Programado!',
            description: `Se ha asignado el ticket a ${technician.name}.`
        });
        
        setIsAiDialogOpen(false);
    };
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    const eventsByTechnicianAndDay: Record<string, Record<string, ScheduleEvent[]>> = technicians.reduce((acc, tech) => {
        acc[tech.id] = {};
        weekDates.forEach(date => {
            const dateString = date.toDateString();
            acc[tech.id][dateString] = events.filter(e => {
                const eventDate = new Date(e.start);
                return e.technicianId === tech.id && eventDate.toDateString() === dateString;
            });
        });
        return acc;
    }, {} as Record<string, Record<string, ScheduleEvent[]>>);

  if (isLoadingUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <AiAssignmentDialog 
        isOpen={isAiDialogOpen}
        onOpenChange={setIsAiDialogOpen}
        isLoading={isLoadingAi}
        suggestion={aiSuggestion}
        onConfirm={handleConfirmAssignment}
      />
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            Calendario Operativo
          </h1>
          <p className="text-muted-foreground">
            Semana del {startOfWeek.getDate()} al {weekDates[6].getDate()} de {startOfWeek.toLocaleString('es-CO', { month: 'long' })}, {startOfWeek.getFullYear()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Programar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Programar Evento</DialogTitle>
                    <DialogDescription>
                        Crea un nuevo turno, tarea o asigna un ticket.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">Título</Label>
                        <Input id="title" placeholder="Ej: Turno de mañana" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="technician" className="text-right">Personal</Label>
                        <Select>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar personal" />
                            </SelectTrigger>
                            <SelectContent>
                                {allTechnicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">Tipo</Label>
                        <Select>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="shift">Turno</SelectItem>
                                <SelectItem value="task">Tarea</SelectItem>
                                <SelectItem value="ticket">Ticket</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Fecha</Label>
                         <Input id="date" type="date" className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Hora</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                             <Input id="start_time" type="time" />
                             <Input id="end_time" type="time" />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit">Guardar Programación</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4 overflow-hidden">
        {/* Unassigned & Technicians Column */}
        <div className="flex flex-col gap-4">
            <Card className="flex flex-col bg-muted/30 h-1/2">
                <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="font-headline text-base">Tickets sin Asignar</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto"
                    onDragOver={(e) => e.preventDefault()}
                >
                    {unassignedTickets.length > 0 ? unassignedTickets.map((ticket) => (
                      <UnassignedTicketCard key={ticket.id} ticket={ticket} />
                    )) : (
                        <p className="text-sm text-muted-foreground p-4 text-center">¡No hay tickets pendientes!</p>
                    )}
                </CardContent>
            </Card>
             <Card className="flex flex-col bg-muted/30 h-1/2">
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="font-headline text-base">Servicios Generales</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto">
                  {technicians.length > 0 ? technicians.map(tech => (
                    <div key={tech.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-background/80">
                         <Avatar className="h-10 w-10">
                            <AvatarImage src={tech.avatar} alt={tech.name} />
                            <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{tech.name}</p>
                            <p className="text-xs text-muted-foreground">{tech.workload}% Carga</p>
                        </div>
                    </div>
                  )) : (
                     <p className="text-sm text-muted-foreground p-4 text-center">No hay personal registrado.</p>
                  )}
                </CardContent>
            </Card>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto border rounded-lg bg-background">
          <div className="grid grid-cols-[60px_repeat(7,1fr)] sticky top-0 bg-background z-20 shadow-sm">
            <div className="p-2 border-b border-r"></div>
            {weekDates.map(date => (
              <div key={date.toString()} className="p-2 text-center border-b border-r font-semibold">
                  <p className="text-xs">{weekDays[date.getDay()]}</p>
                  <p className="text-2xl font-bold">{date.getDate()}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[60px_1fr] h-full">
            {/* Hours Column */}
            <div className="border-r">
                {hours.map(hour => (
                    <div key={hour} className="h-16 border-b text-right pr-2">
                        <span className="text-xs text-muted-foreground relative -top-2">{hour}</span>
                    </div>
                ))}
            </div>
            
            {/* Day columns */}
            <div className={`grid h-full`} style={{ gridTemplateColumns: `repeat(${technicians.length > 0 ? technicians.length : 1}, 1fr)`}}>
                 {weekDates.map((date) => (
                    <div key={date.toString()} className="border-r relative" onDragOver={e => e.preventDefault()}>
                         {hours.map((hour, hourIndex) => (
                             <div 
                                key={hourIndex} 
                                className="h-16 border-b"
                                onDrop={e => {
                                    e.preventDefault();
                                    const ticketId = e.dataTransfer.getData('ticketId');
                                    // Drop logic needs to determine which technician's sub-column it was dropped into.
                                    // This is a simplified placeholder.
                                    const techId = technicians.length > 0 ? technicians[0].id : ''; 
                                    if (ticketId && techId) {
                                      handleDrop(techId, date, hour, ticketId);
                                    }
                                }} 
                             />
                         ))}
                         {/* Events for this day */}
                         <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${technicians.length}, 1fr)`}}>
                             {technicians.map(tech => (
                                <div key={tech.id} className="relative border-r last:border-r-0">
                                    {(eventsByTechnicianAndDay[tech.id]?.[date.toDateString()] || []).map(event => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                             ))}
                         </div>
                    </div>
                 ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
