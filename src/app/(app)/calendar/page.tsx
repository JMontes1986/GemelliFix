
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, updateDoc, Timestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  Loader2,
  Ticket as TicketIcon,
  Briefcase,
  Clock,
  User as UserIcon,
  Pencil,
  Trash2,
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import Link from 'next/link';
import { createCalendarEvent } from '@/ai/flows/create-calendar-event';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { addDays, addMonths, addWeeks, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const generateColorFromString = (id: string, name?: string): string => {
    if (name) {
      if (name === 'Alfredo') return '#F7EF81';
      if (name === 'Guillermo Corrales') return '#CFE795';
      if (name === 'Robinson') return '#0075F2';
      if (name === 'Gloria') return '#FFEAEE';
    }
    
    let hash = 0;
    if (!id) return `hsl(0, 60%, 70%)`;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 7) - hash);
        hash = hash & hash;
    }
    const h = (hash ^ (hash >> 10)) % 360;
    return `hsl(${h}, 60%, 70%)`;
};


const EventCard = ({ event, color, onClick, onEdit, onDelete }: { event: ScheduleEvent, color: string, onClick: () => void, onEdit: () => void, onDelete: (mode: 'single' | 'future') => void }) => {
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
  const textColor = (hsl && hsl[1] > 50 && hsl[2] > 50) ? 'black' : 'white';

  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  return (
    <div
      className={cn(
        'absolute w-full p-2 rounded-lg border text-xs shadow-sm transition-all z-10 text-left group'
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
      <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className={cn("p-1 rounded-full hover:bg-black/10", textColor === 'black' ? 'text-black' : 'text-white' )}>
          <Pencil className="h-3 w-3" />
        </button>
         <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogTrigger asChild>
                <button 
                    onClick={(e) => { 
                        e.stopPropagation(); 
                        if (!event.recurrenceId) {
                            onDelete('single'); 
                            return;
                        }
                        setIsDeleteOpen(true);
                    }} 
                    className={cn("p-1 rounded-full hover:bg-black/10", textColor === 'black' ? 'text-black' : 'text-white')}
                >
                    <Trash2 className="h-3 w-3" />
                </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Eliminar evento recurrente</AlertDialogTitle>
                    <AlertDialogDescription>
                        Este es un evento recurrente. ¿Cómo te gustaría eliminarlo?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={(e) => {e.stopPropagation(); onDelete('single');}}>Eliminar este evento</AlertDialogAction>
                    <AlertDialogAction onClick={(e) => {e.stopPropagation(); onDelete('future');}}>Eliminar este y futuros</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
      <button onClick={onClick} className="h-full w-full text-left">
        <p className="font-bold truncate pr-8">{event.title}</p>
        <p className="opacity-80 truncate">{event.description}</p>
      </button>
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
        e.dataTransfer.setData("ticketPriority", ticket.priority);
        e.dataTransfer.setData("ticketCreatedAt", ticket.createdAt);
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

function EventDetailsDialog({ 
    isOpen, 
    onOpenChange, 
    event,
    technician
}: { 
    isOpen: boolean, 
    onOpenChange: (open: boolean) => void, 
    event: ScheduleEvent | null,
    technician: User | undefined
}) {
    if (!event) return null;

    const eventTypeMap = {
        task: { label: 'Tarea Programada', icon: <Briefcase /> },
        shift: { label: 'Turno', icon: <Clock /> },
        ticket: { label: 'Ticket de Mantenimiento', icon: <TicketIcon /> }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline text-2xl">{event.title}</DialogTitle>
                    <DialogDescription>{event.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center gap-4 text-sm bg-muted/50 p-3 rounded-lg">
                        <span className="text-primary">{eventTypeMap[event.type].icon}</span>
                        <span>{eventTypeMap[event.type].label}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-start gap-3">
                            <Clock className="w-5 h-5 mt-0.5 text-primary" />
                            <div>
                                <p className="font-semibold">Inicio</p>
                                <p className="text-muted-foreground">{event.start.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                             <Clock className="w-5 h-5 mt-0.5 text-primary" />
                            <div>
                                <p className="font-semibold">Fin</p>
                                <p className="text-muted-foreground">{event.end.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}</p>
                            </div>
                        </div>
                    </div>
                     {technician && (
                        <div className="flex items-center gap-3">
                           <UserIcon className="w-5 h-5 text-primary" />
                            <div>
                                <p className="font-semibold">Asignado a</p>
                                <p className="text-muted-foreground">{technician.name}</p>
                            </div>
                        </div>
                     )}
                </div>
                 <DialogFooter>
                    {event.type === 'ticket' && event.ticketId && (
                        <Link href={`/tickets/${event.ticketId}`} className="w-full">
                            <Button className="w-full">
                                <TicketIcon className="mr-2 h-4 w-4" />
                                Ver Ticket de Origen
                            </Button>
                        </Link>
                    )}
                </DialogFooter>
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
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>([]);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestCalendarAssignmentOutput | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { toast } = useToast();
    const router = useRouter();
    const [techniciansToDisplay, setTechniciansToDisplay] = useState<User[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

    // State for manual event creation/editing dialog
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [newEventTechnicianId, setNewEventTechnicianId] = useState('');
    const [newEventType, setNewEventType] = useState<ScheduleEvent['type']>('task');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventStartTime, setNewEventStartTime] = useState('');
    const [newEventEndTime, setNewEventEndTime] = useState('');
    
    // State for recurrence
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    const [isEditRecurrenceDialogOpen, setIsEditRecurrenceDialogOpen] = useState(false);


    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, 'users', firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                        
                        if (userData.role !== 'Administrador' && userData.role !== 'Servicios Generales') {
                            router.push('/tickets');
                            return;
                        }
                        
                        setCurrentUser(userData);

                        // Fetch technicians based on role
                        if (userData.role === 'Administrador') {
                            const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
                            const querySnapshot = await getDocs(techQuery);
                            const techData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                            setTechniciansToDisplay(techData);
                        } else if (userData.role === 'Servicios Generales') {
                            setTechniciansToDisplay([userData]);
                        }
                    } else {
                        router.push('/login');
                    }
                } catch (error) {
                     console.error("Error fetching user data:", error);
                     router.push('/login');
                }
            } else {
                router.push('/login');
            }
        });
        
        return () => unsubscribeAuth();
    }, [router]);


    useEffect(() => {
        if (!currentUser) return;

        const ticketsQuery = query(collection(db, 'tickets'), where('status', 'in', ['Abierto', 'Asignado']));
        const unsubscribeTickets = onSnapshot(ticketsQuery, (snapshot) => {
            const ticketsData = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { 
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()
                } as Ticket
            });
            setUnassignedTickets(ticketsData.filter(t => !t.assignedToIds || t.assignedToIds.length === 0));
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
            unsubscribeEvents();
            unsubscribeTickets();
        };
    }, [toast, currentUser]);

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, technicianId: string, day: Date, hour: number) => {
        e.preventDefault();
        const ticketId = e.dataTransfer.getData("ticketId");
        const ticketTitle = e.dataTransfer.getData("ticketTitle");
        const ticketDescription = e.dataTransfer.getData("ticketDescription");
        const ticketCategory = e.dataTransfer.getData("ticketCategory");
        const ticketPriority = e.dataTransfer.getData("ticketPriority") as Ticket['priority'];
        const ticketCreatedAt = e.dataTransfer.getData("ticketCreatedAt");
        
        if (!ticketId) return;

        const targetDate = new Date(day);
        targetDate.setHours(hour, 0, 0, 0); 
        
        setIsAiDialogOpen(true);
        setIsLoadingAi(true);
        setAiSuggestion(null);

        const input: SuggestCalendarAssignmentInput = {
            ticket: { 
                id: ticketId, 
                title: ticketTitle, 
                description: ticketDescription, 
                category: ticketCategory,
                priority: ticketPriority,
                createdAt: ticketCreatedAt
            },
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
                start: newEvent.start,
                end: newEvent.end
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

            const tech = techniciansToDisplay.find(t => t.id === technician.id);
            if (tech) {
              await createCalendarNotification(tech.name, newEvent);
            }

            toast({
                title: '¡Evento Programado!',
                description: `Se ha asignado el ticket a ${technician.name} y se le ha notificado.`
            });
            
            // Sync with Google Calendar
            await createCalendarEvent({
                summary: newEvent.title,
                description: newEvent.description || 'Sin descripción.',
                start: { dateTime: newEvent.start.toISOString(), timeZone: 'America/Bogota' },
                end: { dateTime: newEvent.end.toISOString(), timeZone: 'America/Bogota' },
            });

            toast({
                title: 'Sincronizado con Google Calendar',
                description: 'El evento también ha sido creado en el calendario de Google.'
            });

        } catch (error) {
            console.error("Error saving event:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el evento. Revisa la conexión con Google Calendar.' });
        } finally {
            setIsAiDialogOpen(false);
        }
    };

    const resetForm = () => {
        setEditingEvent(null);
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventTechnicianId('');
        setNewEventType('task');
        setNewEventDate('');
        setNewEventStartTime('');
        setNewEventEndTime('');
        setIsRecurring(false);
        setRecurrenceFrequency('weekly');
        setRecurrenceDays([]);
        setRecurrenceEndDate('');
    };

    const handleCreateOrUpdateEvent = async () => {
        if (!newEventTitle || !newEventTechnicianId || !newEventDate || !newEventStartTime || !newEventEndTime) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa todos los campos para crear el evento.' });
            return;
        }

        if (isRecurring && !recurrenceEndDate && !editingEvent) {
            toast({ variant: 'destructive', title: 'Campo requerido', description: 'Por favor, define una fecha de fin para la recurrencia.' });
            return;
        }

        setIsCreatingEvent(true);
        try {
            if (editingEvent) {
                // Update logic
                const eventRef = doc(db, 'scheduleEvents', editingEvent.id);
                const start = new Date(`${newEventDate}T${newEventStartTime}`);
                const end = new Date(`${newEventDate}T${newEventEndTime}`);

                await updateDoc(eventRef, {
                    title: newEventTitle,
                    description: newEventDescription,
                    technicianId: newEventTechnicianId,
                    type: newEventType,
                    start,
                    end,
                });

                toast({ title: '¡Evento Actualizado!', description: `El evento ha sido modificado.` });
            } else {
                // Creation logic
                const batch = writeBatch(db);
                let eventCount = 0;
                const tech = techniciansToDisplay.find(t => t.id === newEventTechnicianId);
                const recurrenceId = isRecurring ? `rec-${Date.now()}` : undefined;

                const createEventInstance = (start: Date, end: Date) => {
                    const newEvent: Omit<ScheduleEvent, 'id'> = {
                        title: newEventTitle,
                        description: newEventDescription,
                        start: start,
                        end: end,
                        type: newEventType,
                        technicianId: newEventTechnicianId,
                        recurrenceId,
                    };
                    
                    const eventRef = doc(collection(db, 'scheduleEvents'));
                    batch.set(eventRef, { ...newEvent });
                    
                    if (tech) {
                        createCalendarNotification(tech.name, newEvent);
                    }
                    
                    createCalendarEvent({
                        summary: newEvent.title,
                        description: newEvent.description || 'Sin descripción.',
                        start: { dateTime: newEvent.start.toISOString(), timeZone: 'America/Bogota' },
                        end: { dateTime: newEvent.end.toISOString(), timeZone: 'America/Bogota' },
                    });

                    eventCount++;
                };
                
                const initialStartDateTime = new Date(`${newEventDate}T${newEventStartTime}`);
                const initialEndDateTime = new Date(`${newEventDate}T${newEventEndTime}`);

                if (isRecurring) {
                    let currentStartDate = new Date(initialStartDateTime);
                    const endDate = new Date(recurrenceEndDate);
                    endDate.setHours(23, 59, 59, 999); // Include the whole day

                    while (currentStartDate <= endDate) {
                        const duration = initialEndDateTime.getTime() - initialStartDateTime.getTime();
                        let currentEndDate = new Date(currentStartDate.getTime() + duration);

                        if (recurrenceFrequency === 'daily') {
                            createEventInstance(new Date(currentStartDate), new Date(currentEndDate));
                        } else if (recurrenceFrequency === 'weekly') {
                            if (recurrenceDays.includes(currentStartDate.getDay() === 0 ? 6 : currentStartDate.getDay() - 1)) { // Adjust for Mon-Sun
                                createEventInstance(new Date(currentStartDate), new Date(currentEndDate));
                            }
                        } else if (recurrenceFrequency === 'monthly') {
                            if (currentStartDate.getDate() === initialStartDateTime.getDate()) {
                            createEventInstance(new Date(currentStartDate), new Date(currentEndDate));
                            }
                        }

                        if (recurrenceFrequency === 'monthly') {
                          currentStartDate.setMonth(currentStartDate.getMonth() + 1);
                        } else {
                          currentStartDate.setDate(currentStartDate.getDate() + 1);
                        }
                    }
                } else {
                    createEventInstance(initialStartDateTime, initialEndDateTime);
                }
                
                await batch.commit();

                toast({ title: '¡Evento(s) Creado(s)!', description: `Se ha(n) añadido ${eventCount} evento(s) al calendario.` });
                
                toast({
                    title: 'Sincronizado con Google Calendar',
                    description: 'Los eventos también han sido creados en el calendario de Google.'
                });
            }

            // Reset form
            setIsManualDialogOpen(false);
            resetForm();

        } catch (error) {
            console.error("Error creating/updating event:", error);
            const action = editingEvent ? 'actualizar' : 'guardar';
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo ${action} el evento. Revisa la conexión con Google Calendar.` });
        } finally {
            setIsCreatingEvent(false);
        }
    };
    
    const handleEditEvent = (event: ScheduleEvent) => {
        if (event.recurrenceId) {
            setEditingEvent(event);
            setIsEditRecurrenceDialogOpen(true);
        } else {
            openEditDialog(event);
        }
    };
    
    const openEditDialog = (event: ScheduleEvent) => {
        setEditingEvent(event);
        setNewEventTitle(event.title);
        setNewEventDescription(event.description || '');
        setNewEventTechnicianId(event.technicianId || '');
        setNewEventType(event.type);
        setNewEventDate(event.start.toISOString().split('T')[0]);
        setNewEventStartTime(event.start.toTimeString().substring(0,5));
        setNewEventEndTime(event.end.toTimeString().substring(0,5));
        setIsRecurring(false); // Disable recurrence editing for simplicity
        setIsManualDialogOpen(true);
    };

    const handleDeleteEvent = async (event: ScheduleEvent, mode: 'single' | 'future') => {
        setIsCreatingEvent(true);
        try {
            if (mode === 'single' || !event.recurrenceId) {
                await deleteDoc(doc(db, "scheduleEvents", event.id));
                 toast({ title: 'Evento Eliminado', description: 'El evento ha sido eliminado del calendario.' });
            } else {
                const batch = writeBatch(db);
                const q = query(
                    collection(db, 'scheduleEvents'), 
                    where('recurrenceId', '==', event.recurrenceId),
                    where('start', '>=', event.start)
                );
                const querySnapshot = await getDocs(q);
                
                querySnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                toast({ title: 'Eventos Eliminados', description: `Se han eliminado ${querySnapshot.size} eventos recurrentes.` });
            }
        } catch (error) {
            console.error("Error deleting event(s):", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo eliminar el/los evento(s).' });
        } finally {
            setIsCreatingEvent(false);
        }
    };


    const handleSuggestWithAi = async () => {
        if (!newEventTitle) {
            toast({ variant: 'destructive', title: 'Título requerido', description: 'Escribe un título para la tarea antes de pedir una sugerencia.' });
            return;
        }
        setIsLoadingAi(true);
        try {
            const input: SuggestCalendarAssignmentInput = {
                ticket: {
                    id: `manual-${Date.now()}`,
                    title: newEventTitle,
                    description: newEventDescription,
                    category: 'General',
                    priority: 'Media',
                    createdAt: new Date().toISOString(),
                },
                targetDate: new Date().toISOString(),
                targetTechnicianId: techniciansToDisplay[0]?.id || '', // Default to first technician
            };
            
            const result = await suggestCalendarAssignment(input);
            const suggestedDate = new Date(result.suggestedTime);
            
            setNewEventTechnicianId(result.technician.id);
            setNewEventDate(suggestedDate.toISOString().split('T')[0]);
            setNewEventStartTime(suggestedDate.toTimeString().substring(0,5));
            // Set end time 2 hours later
            const endTime = new Date(suggestedDate.getTime() + 2 * 60 * 60 * 1000);
            setNewEventEndTime(endTime.toTimeString().substring(0,5));
            
            toast({
                title: 'Sugerencia Aplicada',
                description: result.reason
            });

        } catch (error) {
            console.error('Error getting AI suggestion for manual task:', error);
            toast({ variant: 'destructive', title: 'Error de IA', description: 'No se pudo obtener la sugerencia.' });
        } finally {
            setIsLoadingAi(false);
        }
    };
    
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    const dayOffset = (dayOfWeek === 0) ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + dayOffset);

    const weekDates = Array.from({ length: 5 }, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    const datesToDisplay = viewMode === 'week' ? weekDates : [currentDate];

    const eventsByTechnicianAndDay = (technicianId: string, day: Date) => {
        return events.filter(e => {
            if (!e.technicianId) return false;
            const eventDate = e.start;
            return e.technicianId === technicianId && eventDate.toDateString() === day.toDateString();
        });
    };
    
    const handleEventClick = (event: ScheduleEvent) => {
        setSelectedEvent(event);
    };

    const handleDateChange = (direction: 'prev' | 'next') => {
        const increment = direction === 'next' ? 1 : -1;
        if (viewMode === 'week') {
            setCurrentDate(d => addWeeks(d, increment));
        } else {
            setCurrentDate(d => addDays(d, increment));
        }
    };

    const getHeaderDescription = () => {
        if (viewMode === 'week') {
            const endOfWeek = new Date(weekDates[4]);
            return `Semana del ${format(weekDates[0], 'd LLL', { locale: es })} al ${format(endOfWeek, 'd LLL, yyyy', { locale: es })}`;
        }
        return format(currentDate, 'cccc, d MMMM, yyyy', { locale: es });
    };

  if (isLoadingData || !currentUser) {
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
      <EventDetailsDialog 
        isOpen={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent}
        technician={techniciansToDisplay.find(t => t.id === selectedEvent?.technicianId)}
      />
       <AlertDialog open={isEditRecurrenceDialogOpen} onOpenChange={setIsEditRecurrenceDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Editar evento recurrente</AlertDialogTitle>
                    <AlertDialogDescription>
                        Este es un evento recurrente. La edición de series completas estará disponible pronto. Por ahora, puedes editar solo esta instancia.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { if(editingEvent) openEditDialog(editingEvent) }}>Editar solo este evento</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            Calendario Operativo
          </h1>
          <p className="text-muted-foreground">
            {getHeaderDescription()}
          </p>
        </div>
        <div className="flex items-center gap-2">
            <Tabs defaultValue="week" value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <TabsList>
                    <TabsTrigger value="week">Semana</TabsTrigger>
                    <TabsTrigger value="day">Día</TabsTrigger>
                </TabsList>
            </Tabs>
          <Button variant="outline" size="icon" onClick={() => handleDateChange('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleDateChange('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Dialog open={isManualDialogOpen} onOpenChange={(open) => { setIsManualDialogOpen(open); if(!open) resetForm(); }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Programar
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editingEvent ? "Editar Evento" : "Programar Evento"}</DialogTitle>
                    <DialogDescription>
                         {editingEvent ? "Modifica los detalles del evento." : "Crea un nuevo turno, tarea o asigna un ticket."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[90vh] overflow-y-auto pr-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input id="title" placeholder="Ej: Mantenimiento Aires" value={newEventTitle} onChange={(e) => setNewEventTitle(e.target.value)} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" placeholder="Ej: Limpieza de filtros y revisión de gas" value={newEventDescription} onChange={(e) => setNewEventDescription(e.target.value)} />
                    </div>

                    {!editingEvent && (
                        <div className="pt-2 flex justify-end">
                            <Button variant="outline" size="sm" onClick={handleSuggestWithAi} disabled={!newEventTitle || isLoadingAi}>
                                {isLoadingAi ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                Sugerir con IA
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="technician">Personal</Label>
                          <Select onValueChange={setNewEventTechnicianId} value={newEventTechnicianId}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar personal" />
                              </SelectTrigger>
                              <SelectContent>
                                  {techniciansToDisplay.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                              </SelectContent>
                          </Select>
                      </div>
                       <div className="space-y-2">
                          <Label htmlFor="type">Tipo</Label>
                          <Select onValueChange={(v) => setNewEventType(v as ScheduleEvent['type'])} value={newEventType}>
                              <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="shift">Turno</SelectItem>
                                  <SelectItem value="task">Tarea</SelectItem>
                                  <SelectItem value="ticket">Ticket</SelectItem>
                              </SelectContent>
                          </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-1">
                            <Label htmlFor="date">Fecha</Label>
                            <Input id="date" type="date" value={newEventDate} onChange={(e) => setNewEventDate(e.target.value)} />
                        </div>
                        <div className="space-y-2 md:col-span-2 grid grid-cols-2 gap-2">
                            <div>
                               <Label htmlFor="start_time">Hora Inicio</Label>
                               <Input id="start_time" type="time" value={newEventStartTime} onChange={(e) => setNewEventStartTime(e.target.value)} />
                            </div>
                             <div>
                                <Label htmlFor="end_time">Hora Fin</Label>
                                <Input id="end_time" type="time" value={newEventEndTime} onChange={(e) => setNewEventEndTime(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    
                    {!editingEvent && (
                        <div className="space-y-4 pt-4 border-t">
                            <div className="flex items-center space-x-2">
                                <Switch id="recurring-switch" checked={isRecurring} onCheckedChange={setIsRecurring} />
                                <Label htmlFor="recurring-switch">Repetir Evento</Label>
                            </div>
                            {isRecurring && (
                                <div className="space-y-4 p-4 border rounded-md bg-muted/30">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="recurrence-frequency">Frecuencia</Label>
                                            <Select value={recurrenceFrequency} onValueChange={(v) => setRecurrenceFrequency(v as any)}>
                                                <SelectTrigger><SelectValue/></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="daily">Diariamente</SelectItem>
                                                    <SelectItem value="weekly">Semanalmente</SelectItem>
                                                    <SelectItem value="monthly">Mensualmente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="recurrence-end-date">Finaliza en</Label>
                                            <Input id="recurrence-end-date" type="date" value={recurrenceEndDate} onChange={(e) => setRecurrenceEndDate(e.target.value)} />
                                        </div>
                                    </div>

                                    {recurrenceFrequency === 'weekly' && (
                                        <div>
                                            <Label>Repetir los días</Label>
                                            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                                                {[{id: 1, label: 'Lu'}, {id: 2, label: 'Ma'}, {id: 3, label: 'Mi'}, {id: 4, label: 'Ju'}, {id: 5, label: 'Vi'}, {id: 6, label: 'Sa'}, {id: 0, label: 'Do'}].map(day => (
                                                    <div key={day.id} className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`day-${day.id}`}
                                                            checked={recurrenceDays.includes(day.id)}
                                                            onCheckedChange={(checked) => {
                                                                setRecurrenceDays(prev => checked ? [...prev, day.id] : prev.filter(d => d !== day.id));
                                                            }}
                                                        />
                                                        <Label htmlFor={`day-${day.id}`} className="font-normal">{day.label}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleCreateOrUpdateEvent} disabled={isCreatingEvent}>
                        {isCreatingEvent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingEvent ? 'Guardar Cambios' : 'Guardar Programación'}
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
                         <Avatar className="h-10 w-10 border-2" style={{ borderColor: generateColorFromString(tech.id, tech.name) }}>
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
            <div className="grid" style={{ gridTemplateColumns: `repeat(${datesToDisplay.length}, 1fr)` }}>
              {datesToDisplay.map((date, dayIndex) => (
                <div key={date.toISOString()} className={cn("relative", dayIndex < datesToDisplay.length - 1 && 'border-r')}>
                  {/* Day Header */}
                   <div className="h-8 border-b text-center text-sm font-medium sticky top-0 bg-background z-20">
                     {weekDays[(date.getDay() + 6) % 7]} {date.getDate()}
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
                            <EventCard 
                                key={event.id} 
                                event={event} 
                                color={generateColorFromString(tech.id, tech.name)} 
                                onClick={() => handleEventClick(event)}
                                onEdit={() => handleEditEvent(event)}
                                onDelete={(mode) => handleDeleteEvent(event, mode)}
                             />
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

    