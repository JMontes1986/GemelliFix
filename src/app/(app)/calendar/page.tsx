
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot } from 'firebase/firestore';
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
import { tickets as unassignedTicketsData } from '@/lib/data';
import type { ScheduleEvent, Ticket, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { suggestCalendarAssignment, type SuggestCalendarAssignmentInput, type SuggestCalendarAssignmentOutput } from '@/ai/flows/suggest-calendar-assignment';
import { Skeleton } from '@/components/ui/skeleton';


const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const eventStartDate = new Date(event.start);
  const eventEndDate = new Date(event.end);
  
  const startHour = eventStartDate.getHours();
  const startMinutes = eventStartDate.getMinutes();
  const endHour = eventEndDate.getHours();
  const endMinutes = eventEndDate.getMinutes();

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
         'bg-secondary text-secondary-foreground'
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
        e.dataTransfer.setData("ticketTitle", ticket.title);
        e.dataTransfer.setData("ticketDescription", ticket.description);
        e.dataTransfer.setData("ticketCategory", ticket.category);
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

async function createCalendarNotification(technicianName: string, event: Omit<ScheduleEvent, 'id'>) {
    try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("name", "==", technicianName));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.warn(`User not found for technician: ${technicianName}`);
            return;
        }

        const userDoc = querySnapshot.docs[0];
        const userId = userDoc.data().id;

        const newNotification = {
            userId: userId,
            title: 'Nueva Actividad en Calendario',
            description: `Se te ha asignado: "${event.title}" para el ${new Date(event.start).toLocaleDateString()}`,
            createdAt: serverTimestamp(),
            read: false,
            type: 'schedule' as const,
            linkTo: `/calendar`,
        };
        await addDoc(collection(db, "notifications"), newNotification);

    } catch (error) {
        console.error("Error creating calendar notification:", error);
    }
}

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date('2024-08-18T00:00:00'));
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>(unassignedTicketsData.filter(t => !t.assignedTo || t.assignedTo.length === 0));
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestCalendarAssignmentOutput | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { toast } = useToast();
    const [allTechnicians, setAllTechnicians] = useState<User[]>([]);

     useEffect(() => {
        const fetchTechnicians = async () => {
            const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
            const querySnapshot = await getDocs(techQuery);
            const techData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllTechnicians(techData);
        };
        fetchTechnicians();
    }, []);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
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
        });

        const q = query(collection(db, 'scheduleEvents'));
        const unsubscribeEvents = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ScheduleEvent));
            setEvents(fetchedEvents);
            setIsLoadingData(false);
        }, (error) => {
            console.error("Error fetching calendar events:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los eventos del calendario.' });
            setIsLoadingData(false);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeEvents();
        };
    }, [toast]);

    const techniciansToDisplay = currentUser?.role === 'Servicios Generales' 
        ? allTechnicians.filter(t => t.id === currentUser.id)
        : allTechnicians;

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, technicianId: string, day: Date, hour: number) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData("ticketId");
        const ticketTitle = e.dataTransfer.getData("ticketTitle");
        const ticketDescription = e.dataTransfer.getData("ticketDescription");
        const ticketCategory = e.dataTransfer.getData("ticketCategory");
        
        if (!ticketId) return;

        const targetDate = new Date(day);
        targetDate.setHours(hour, 0, 0, 0); // Set time precisely
        
        setIsAiDialogOpen(true);
        setIsLoadingAi(true);
        setAiSuggestion(null);

        const input: SuggestCalendarAssignmentInput = {
            ticket: { id: ticketId, title: ticketTitle, description: ticketDescription, category: ticketCategory },
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

    const handleConfirmAssignment = async (suggestion: SuggestCalendarAssignmentOutput) => {
        const { ticket, technician, suggestedTime } = suggestion;
        
        const newEvent: Omit<ScheduleEvent, 'id'> = {
            title: `Ticket: ${ticket.title}`,
            description: ticket.description,
            start: new Date(suggestedTime).toISOString(),
            end: new Date(new Date(suggestedTime).getTime() + 2 * 60 * 60 * 1000).toISOString(), // Assume 2 hour duration
            type: 'ticket',
            technicianId: technician.id,
            ticketId: ticket.id
        };
        
        try {
            await addDoc(collection(db, "scheduleEvents"), newEvent);
            setUnassignedTickets(prev => prev.filter(t => t.id !== ticket.id));
            
            await createCalendarNotification(technician.name, newEvent);

            toast({
                title: '¡Evento Programado!',
                description: `Se ha asignado el ticket a ${technician.name} y se le ha notificado.`
            });

        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el evento en el calendario.' });
        } finally {
            setIsAiDialogOpen(false);
        }
    };
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    const eventsByTechnicianAndDay: Record<string, Record<string, ScheduleEvent[]>> = techniciansToDisplay.reduce((acc, tech) => {
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

  if (isLoadingData) {
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
                  {techniciansToDisplay.length > 0 ? techniciansToDisplay.map(tech => (
                    <div key={tech.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-background/80">
                         <Avatar className="h-10 w-10">
                            <AvatarImage src={tech.avatar} alt={tech.name} />
                            <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{tech.name}</p>
                        </div>
                    </div>
                  )) : (
                     <p className="text-sm text-muted-foreground p-4 text-center">No hay personal registrado.</p>
                  )}
                </CardContent>
            </Card>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto border rounded-lg bg-background relative">
          {/* Header */}
          <div className="grid grid-cols-[60px_1fr] sticky top-0 bg-background z-20 shadow-sm">
              <div className="p-2 border-b border-r"></div>
              <div className="grid" style={{gridTemplateColumns: `repeat(${techniciansToDisplay.length}, 1fr)`}}>
                {techniciansToDisplay.map((tech, index) => (
                    <div key={tech.id} className={`p-2 text-center border-b ${index < techniciansToDisplay.length -1 ? 'border-r' : ''}`}>
                         <p className="font-semibold text-sm truncate">{tech.name}</p>
                    </div>
                ))}
              </div>
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
            <div className={`grid grid-cols-7 h-full`}>
                 {weekDates.map((date, dayIndex) => (
                    <div key={date.toDateString()} className={`relative ${dayIndex < weekDates.length - 1 ? 'border-r' : ''}`}>
                         {/* Background Hour Lines */}
                         {hours.map((hour) => (
                            <div key={`${date.toDateString()}-${hour}`} className="h-16 border-b" />
                         ))}

                         {/* Drop-target and Event Overlay */}
                         <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${techniciansToDisplay.length}, 1fr)`}}>
                             {techniciansToDisplay.map((tech, techIndex) => (
                                <div 
                                    key={tech.id} 
                                    className={`relative ${techIndex < techniciansToDisplay.length -1 ? 'border-r' : ''} h-full`}
                                    onDragOver={e => e.preventDefault()}
                                    onDrop={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const y = e.clientY - rect.top;
                                        const hourSlot = Math.floor(y / 64); // 64px = h-16
                                        const hour = hourSlot + 8; // Starts at 8am
                                        handleDrop(e, tech.id, date, hour);
                                    }}
                                >
                                    {/* Events for this technician on this day */}
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
