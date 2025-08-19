
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
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
import type { ScheduleEvent, Ticket, User } from '@/lib/types';
import { cn, createLog } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { suggestCalendarAssignment, type SuggestCalendarAssignmentInput, type SuggestCalendarAssignmentOutput } from '@/ai/flows/suggest-calendar-assignment';
import { Skeleton } from '@/components/ui/skeleton';


const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const generateColorFromString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, 50%, 60%)`;
};


const EventCard = ({ event, color }: { event: ScheduleEvent, color: string }) => {
  const eventStartDate = event.start;
  const eventEndDate = event.end;
  
  const startHour = eventStartDate.getHours();
  const startMinutes = eventStartDate.getMinutes();
  const endHour = eventEndDate.getHours();
  const endMinutes = eventEndDate.getMinutes();

  const totalStartMinutes = (startHour - 8) * 60 + startMinutes;
  const totalEndMinutes = (endHour - 8) * 60 + endMinutes;
  const durationMinutes = totalEndMinutes - totalStartMinutes;

  const top = Math.max(0, (totalStartMinutes / 60) * 64); 
  const height = (durationMinutes / 60) * 64;

  const hsl = color.match(/\d+/g)?.map(Number);
  const textColor = (hsl && hsl[2] > 50) ? 'black' : 'white';

  return (
    <div
      className={cn(
        'absolute w-full p-2 rounded-lg border text-xs shadow-sm cursor-pointer hover:shadow-md transition-all z-10'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
        left: 0,
        right: 0,
        marginLeft: '2px',
        marginRight: '2px',
        backgroundColor: color,
        borderColor: color,
        color: textColor,
      }}
    >
      <p className="font-bold truncate">{event.title}</p>
      <p className="opacity-80 truncate">{event.description}</p>
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
            description: `Se te ha asignado: "${event.title}" para el ${event.start.toLocaleDateString()}`,
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
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestCalendarAssignmentOutput | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { toast } = useToast();
    const [allTechnicians, setAllTechnicians] = useState<User[]>([]);

    // State for manual event creation dialog
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventTechnicianId, setNewEventTechnicianId] = useState('');
    const [newEventType, setNewEventType] = useState<ScheduleEvent['type']>('task');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventStartTime, setNewEventStartTime] = useState('');
    const [newEventEndTime, setNewEventEndTime] = useState('');


     useEffect(() => {
        const fetchTechnicians = async () => {
            const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
            const querySnapshot = await getDocs(techQuery);
            const techData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllTechnicians(techData);
        };
        fetchTechnicians();
        
        const ticketsQuery = query(collection(db, 'tickets'), where('status', 'in', ['Abierto', 'Asignado']));
        const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
            const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as Ticket));
            setUnassignedTickets(ticketsData.filter(t => !t.assignedToIds || t.assignedToIds.length === 0));
        });

        return () => unsubscribeTickets();

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
            const fetchedEvents = snapshot.docs.map(doc => {
                const data = doc.data();
                const start = data.start?.toDate ? data.start.toDate() : new Date(data.start);
                const end = data.end?.toDate ? data.end.toDate() : new Date(data.end);
                return {
                    id: doc.id,
                    ...data,
                    start,
                    end
                } as ScheduleEvent;
            });
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
        targetDate.setHours(hour, 0, 0, 0); 
        
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
        
        const newEventStart = new Date(suggestedTime);
        const newEventEnd = new Date(newEventStart.getTime() + 2 * 60 * 60 * 1000); // Assume 2 hour duration

        const newEvent: Omit<ScheduleEvent, 'id'> = {
            title: `Ticket: ${ticket.title}`,
            description: ticket.description,
            start: newEventStart,
            end: newEventEnd,
            type: 'ticket',
            technicianId: technician.id,
            ticketId: ticket.id
        };
        
        try {
            await addDoc(collection(db, "scheduleEvents"), {
                ...newEvent,
                start: Timestamp.fromDate(newEvent.start),
                end: Timestamp.fromDate(newEvent.end)
            });
            
            const ticketRef = doc(db, "tickets", ticket.id);
            await updateDoc(ticketRef, {
                status: 'Asignado',
                assignedTo: [technician.name],
                assignedToIds: [technician.id]
            });

            if (currentUser) {
              await createLog(currentUser, 'update_assignment', { ticket: { ...ticket, assignedTo: [technician.name] } as Ticket, oldValue: 'Sin Asignar', newValue: technician.name });
            }

            const tech = allTechnicians.find(t => t.id === technician.id);
            if (tech) {
              await createCalendarNotification(tech.name, newEvent);
            }

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

    const handleCreateEvent = async () => {
        if (!newEventTitle || !newEventTechnicianId || !newEventDate || !newEventStartTime || !newEventEndTime) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa todos los campos para crear el evento.' });
            return;
        }

        setIsCreatingEvent(true);
        try {
            const startDateTime = new Date(`${newEventDate}T${newEventStartTime}`);
            const endDateTime = new Date(`${newEventDate}T${newEventEndTime}`);

            const newEvent: Omit<ScheduleEvent, 'id'> = {
                title: newEventTitle,
                description: `Tarea: ${newEventTitle}`,
                start: startDateTime,
                end: endDateTime,
                type: newEventType,
                technicianId: newEventTechnicianId,
            };

            await addDoc(collection(db, 'scheduleEvents'), {
                ...newEvent,
                start: Timestamp.fromDate(startDateTime),
                end: Timestamp.fromDate(endDateTime)
            });
            
            const tech = allTechnicians.find(t => t.id === newEventTechnicianId);
            if (tech) {
                await createCalendarNotification(tech.name, newEvent);
            }

            toast({ title: '¡Evento Creado!', description: 'La nueva tarea ha sido añadida al calendario.' });

            setIsManualDialogOpen(false);
            setNewEventTitle('');
            setNewEventTechnicianId('');
            setNewEventType('task');
            setNewEventDate('');
            setNewEventStartTime('');
            setNewEventEndTime('');

        } catch (error) {
            console.error("Error creating manual event:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el evento.' });
        } finally {
            setIsCreatingEvent(false);
        }
    };
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekDates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    const eventsByTechnicianAndDay = (technicianId: string, day: Date) => {
        return events.filter(e => {
            if (!e.technicianId) return false;
            const eventDate = e.start;
            return e.technicianId === technicianId && eventDate.toDateString() === day.toDateString();
        });
    };

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
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() - 7)))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(d => new Date(d.setDate(d.getDate() + 7)))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
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
                        <Input id="title" placeholder="Ej: Turno de mañana" className="col-span-3" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="technician" className="text-right">Personal</Label>
                        <Select onValueChange={setNewEventTechnicianId} value={newEventTechnicianId}>
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
                        <Select onValueChange={(v) => setNewEventType(v as ScheduleEvent['type'])} value={newEventType}>
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
                         <Input id="date" type="date" className="col-span-3" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Hora</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                             <Input id="start_time" type="time" value={newEventStartTime} onChange={(e) => setNewEventStartTime(e.target.value)} />
                             <Input id="end_time" type="time" value={newEventEndTime} onChange={(e) => setNewEventEndTime(e.target.value)} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleCreateEvent} disabled={isCreatingEvent}>
                        {isCreatingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Programación
                    </Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-4 overflow-hidden h-full">
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
                         <Avatar className="h-10 w-10 border-2" style={{ borderColor: generateColorFromString(tech.id) }}>
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
        <div className="flex-1 overflow-auto border rounded-lg bg-background">
          <div className="grid grid-cols-[60px_1fr] h-full">
            {/* Hours Column */}
            <div className="border-r">
                <div className="h-8 border-b grid grid-cols-1"></div>
                {hours.map(hour => (
                    <div key={hour} className="h-16 border-b text-right pr-2">
                        <span className="text-xs text-muted-foreground relative -top-2">{hour}</span>
                    </div>
                ))}
            </div>
            
            {/* Days and Technicians Grid */}
            <div className="grid" style={{ gridTemplateColumns: `repeat(${weekDates.length}, 1fr)` }}>
              {weekDates.map((date, dayIndex) => (
                <div key={date.toISOString()} className={cn("relative", dayIndex < weekDates.length - 1 && 'border-r')}>
                  {/* Day Header */}
                   <div className="h-8 border-b text-center text-sm font-medium sticky top-0 bg-background z-20">
                     {weekDays[date.getDay()]} {date.getDate()}
                   </div>
                  
                  {/* Background Hour Lines */}
                  <div className="absolute inset-x-0 top-8">
                    {hours.map((_, hourIndex) => (
                      <div key={hourIndex} className={cn("h-16", hourIndex < hours.length - 1 && 'border-b')} />
                    ))}
                  </div>

                  {/* Technician Columns for the Day */}
                  <div className="absolute inset-0 top-8 grid" style={{ gridTemplateColumns: `repeat(${techniciansToDisplay.length}, 1fr)` }}>
                    {techniciansToDisplay.map((tech, techIndex) => (
                      <div
                        key={tech.id}
                        className={cn("relative h-full", techIndex < techniciansToDisplay.length - 1 && 'border-r')}
                        onDragOver={e => e.preventDefault()}
                        onDrop={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const y = e.clientY - rect.top;
                            const hourSlot = Math.floor(y / 64);
                            const hour = hourSlot + 8;
                            handleDrop(e, tech.id, date, hour);
                        }}
                      >
                        {/* Events for this technician on this day */}
                        {eventsByTechnicianAndDay(tech.id, date).map(event => (
                            <EventCard key={event.id} event={event} color={generateColorFromString(tech.id)} />
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

