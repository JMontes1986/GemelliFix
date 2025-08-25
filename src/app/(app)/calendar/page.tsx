
'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, updateDoc, Timestamp, writeBatch, deleteDoc, orderBy } from 'firebase/firestore';
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
  CalendarDays,
  AlertTriangle,
  Users,
  Eye,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
import type { ScheduleEvent, Ticket, User, Category } from '@/lib/types';
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
import { addDays, addMonths, addWeeks, format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
  } from "@/components/ui/accordion"
import { Badge } from '@/components/ui/badge';


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


const EventCard = ({ event, color, onClick, onEdit, onDelete, isSelected }: { event: ScheduleEvent, color: string, onClick: () => void, onEdit: (e: React.MouseEvent) => void, onDelete: (e: React.MouseEvent) => void, isSelected: boolean }) => {
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


  return (
    <div
      className={cn(
        'absolute w-full rounded-lg border text-xs shadow-sm transition-all z-10 text-left group flex flex-col',
        isSelected && 'ring-2 ring-primary ring-offset-2'
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
       <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button onClick={onEdit} className={cn("p-1 rounded-full hover:bg-black/10", textColor === 'black' ? 'text-black' : 'text-white' )}>
              <Pencil className="h-3 w-3" />
          </button>
          <button onClick={onDelete} className={cn("p-1 rounded-full hover:bg-black/10", textColor === 'black' ? 'text-black' : 'text-white')}>
              <Trash2 className="h-3 w-3" />
          </button>
      </div>
       <button onClick={onClick} className="h-full w-full text-left p-2">
            <p className="font-bold truncate pr-8">{event.title}</p>
            <p className="opacity-80 truncate">{event.description}</p>
       </button>
    </div>
  );
};


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

async function createCalendarNotification(technicianName: string, event: Omit<ScheduleEvent, 'id' | 'recurrenceId'>) {
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

// Define state for deletion dialog
type DeleteDialogState = {
    isOpen: boolean;
    eventToDelete: ScheduleEvent | null;
}

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiSuggestion, setAiSuggestion] = useState<SuggestCalendarAssignmentOutput | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const { toast } = useToast();
    const router = useRouter();
    const [allTechnicians, setAllTechnicians] = useState<User[]>([]);
    const [allCategories, setAllCategories] = useState<Category[]>([]);
    const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);


    // State for manual event creation/editing dialog
    const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
    const [isCreatingEvent, setIsCreatingEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState<ScheduleEvent | null>(null);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDescription, setNewEventDescription] = useState('');
    const [newEventTechnicianIds, setNewEventTechnicianIds] = useState<string[]>([]);
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventStartTime, setNewEventStartTime] = useState('');
    const [newEventEndTime, setNewEventEndTime] = useState('');
    
    // State for recurrence
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [recurrenceDays, setRecurrenceDays] = useState<number[]>([]);
    const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

    const [isEditRecurrenceDialogOpen, setIsEditRecurrenceDialogOpen] = useState(false);
    
    const [deleteDialogState, setDeleteDialogState] = useState<DeleteDialogState>({
        isOpen: false,
        eventToDelete: null,
    });

    const techniciansToDisplay = selectedTechnicianId
      ? allTechnicians.filter((t) => t.id === selectedTechnicianId)
      : allTechnicians;


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
                            setAllTechnicians(techData);
                        } else if (userData.role === 'Servicios Generales') {
                            setAllTechnicians([userData]);
                            setSelectedTechnicianId(userData.id); // Auto-select the technician themselves
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

        // Fetch all categories for the manual task creation dropdown
        const catQuery = query(collection(db, 'categories'), orderBy('name'));
        const unsubscribeCats = onSnapshot(catQuery, (snapshot) => {
            const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setAllCategories(cats);
        });


        return () => {
            unsubscribeEvents();
            unsubscribeCats();
        };
    }, [toast, currentUser]);

    const resetForm = () => {
        setEditingEvent(null);
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventTechnicianIds([]);
        setNewEventDate('');
        setNewEventStartTime('');
        setNewEventEndTime('');
        setIsRecurring(false);
        setRecurrenceFrequency('weekly');
        setRecurrenceDays([]);
        setRecurrenceEndDate('');
    };

    const handleCreateOrUpdateEvent = async () => {
        if (!newEventTitle || newEventTechnicianIds.length === 0 || !newEventDate || !newEventStartTime || !newEventEndTime) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, completa el título, personal, fecha y horas para crear el evento.' });
            return;
        }

        if (isRecurring && !recurrenceEndDate && !editingEvent) {
            toast({ variant: 'destructive', title: 'Campo requerido', description: 'Por favor, define una fecha de fin para la recurrencia.' });
            return;
        }

        setIsCreatingEvent(true);
        try {
            if (editingEvent) {
                // Update logic (only for single event, single technician)
                const eventRef = doc(db, 'scheduleEvents', editingEvent.id);
                const start = new Date(`${newEventDate}T${newEventStartTime}`);
                const end = new Date(`${newEventDate}T${newEventEndTime}`);

                await updateDoc(eventRef, {
                    title: newEventTitle,
                    description: newEventDescription,
                    technicianId: newEventTechnicianIds[0], // Assuming single update
                    type: 'task',
                    start,
                    end,
                });

                toast({ title: '¡Evento Actualizado!', description: `El evento ha sido modificado.` });
            } else {
                // Creation logic
                const batch = writeBatch(db);
                let eventCount = 0;
                
                const createEventInstance = (start: Date, end: Date, technicianId: string) => {
                    const tech = allTechnicians.find(t => t.id === technicianId);
                    if (!tech) return;
    
                    const baseEvent: Omit<ScheduleEvent, 'id' | 'recurrenceId'> & { recurrenceId?: string } = {
                        title: newEventTitle,
                        description: newEventDescription,
                        start: start,
                        end: end,
                        type: 'task',
                        technicianId: technicianId,
                    };
                    
                    if (isRecurring) {
                      const recurrenceId = `rec-${Date.now()}`;
                      baseEvent.recurrenceId = recurrenceId;
                    }
                    
                    const eventRef = doc(collection(db, 'scheduleEvents'));
                    batch.set(eventRef, baseEvent);
                    createCalendarNotification(tech.name, baseEvent);
                    
                    createCalendarEvent({
                        summary: baseEvent.title,
                        description: baseEvent.description || 'Sin descripción.',
                        start: { dateTime: baseEvent.start.toISOString(), timeZone: 'America/Bogota' },
                        end: { dateTime: baseEvent.end.toISOString(), timeZone: 'America/Bogota' },
                    });

                    eventCount++;
                };
                
                const initialStartDateTime = new Date(`${newEventDate}T${newEventStartTime}`);
                const initialEndDateTime = new Date(`${newEventDate}T${newEventEndTime}`);

                for (const techId of newEventTechnicianIds) {
                    if (isRecurring) {
                        let currentStartDate = new Date(initialStartDateTime);
                        const endDate = new Date(recurrenceEndDate);
                        endDate.setHours(23, 59, 59, 999); // Include the whole day

                        while (currentStartDate <= endDate) {
                            const duration = initialEndDateTime.getTime() - initialStartDateTime.getTime();
                            let currentEndDate = new Date(currentStartDate.getTime() + duration);

                            if (recurrenceFrequency === 'daily') {
                                createEventInstance(new Date(currentStartDate), new Date(currentEndDate), techId);
                            } else if (recurrenceFrequency === 'weekly') {
                                if (recurrenceDays.includes(currentStartDate.getDay() === 0 ? 6 : currentStartDate.getDay() - 1)) { // Adjust for Mon-Sun
                                    createEventInstance(new Date(currentStartDate), new Date(currentEndDate), techId);
                                }
                            } else if (recurrenceFrequency === 'monthly') {
                                if (currentStartDate.getDate() === initialStartDateTime.getDate()) {
                                createEventInstance(new Date(currentStartDate), new Date(currentEndDate), techId);
                                }
                            }

                            if (recurrenceFrequency === 'monthly') {
                              currentStartDate.setMonth(currentStartDate.getMonth() + 1);
                            } else {
                              currentStartDate.setDate(currentStartDate.getDate() + 1);
                            }
                        }
                    } else {
                        createEventInstance(initialStartDateTime, initialEndDateTime, techId);
                    }
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
    
    const handleEditEvent = (e: React.MouseEvent, event: ScheduleEvent) => {
        e.stopPropagation();
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
        setNewEventTechnicianIds(event.technicianId ? [event.technicianId] : []);
        setNewEventDate(event.start.toISOString().split('T')[0]);
        setNewEventStartTime(event.start.toTimeString().substring(0,5));
        setNewEventEndTime(event.end.toTimeString().substring(0,5));
        setIsRecurring(false); // Disable recurrence editing for simplicity
        setIsManualDialogOpen(true);
    };

    const handleDeleteClick = (e: React.MouseEvent, event: ScheduleEvent) => {
        e.stopPropagation();
        setDeleteDialogState({ eventToDelete: event, isOpen: true });
    };
    
    const handleConfirmDelete = async (mode: 'single' | 'future') => {
        const eventToDelete = deleteDialogState.eventToDelete;
        if (!eventToDelete) return;
    
        setIsCreatingEvent(true);
        try {
            if (mode === 'single' || !eventToDelete.recurrenceId) {
                await deleteDoc(doc(db, "scheduleEvents", eventToDelete.id));
                toast({ title: 'Evento Eliminado', description: 'El evento ha sido eliminado del calendario.' });
            } else { // mode === 'future'
                const batch = writeBatch(db);
                const q = query(
                    collection(db, 'scheduleEvents'), 
                    where('recurrenceId', '==', eventToDelete.recurrenceId),
                    where('start', '>=', eventToDelete.start)
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
            // Close and reset dialog state
            setDeleteDialogState({ isOpen: false, eventToDelete: null });
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
                targetTechnicianId: allTechnicians[0]?.id || '', // Default to first technician
            };
            
            const result = await suggestCalendarAssignment(input);
            const suggestedDate = new Date(result.suggestedTime);
            
            setNewEventTechnicianIds([result.technician.id]);
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
    
    const visibleEvents = events.filter(e => {
        const eventDate = startOfDay(e.start);
        const matchesTechnician = selectedTechnicianId ? e.technicianId === selectedTechnicianId : true;
        const matchesDate = datesToDisplay.some(d => startOfDay(d).getTime() === eventDate.getTime());
        return matchesTechnician && matchesDate;
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

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
    
    const handleAgendaItemClick = (event: ScheduleEvent) => {
        setCurrentDate(event.start);
        setSelectedEvent(event);
    }

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
    
    const groupedVisibleEvents = visibleEvents.reduce((acc, event) => {
        (acc[event.title] = acc[event.title] || []).push(event);
        return acc;
      }, {} as Record<string, ScheduleEvent[]>);

  if (isLoadingData || !currentUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <EventDetailsDialog 
        isOpen={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent}
        technician={allTechnicians.find(t => t.id === selectedEvent?.technicianId)}
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
        <AlertDialog open={deleteDialogState.isOpen} onOpenChange={(open) => setDeleteDialogState({ isOpen: open, eventToDelete: open ? deleteDialogState.eventToDelete : null })}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive"/>
                        Confirmar Eliminación
                    </AlertDialogTitle>
                    {deleteDialogState.eventToDelete?.recurrenceId ? (
                         <AlertDialogDescription>
                            Este es un evento recurrente. ¿Cómo te gustaría eliminarlo?
                        </AlertDialogDescription>
                    ) : (
                        <AlertDialogDescription>
                            ¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                {deleteDialogState.eventToDelete?.recurrenceId ? (
                    <AlertDialogFooter className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <AlertDialogAction onClick={() => handleConfirmDelete('single')}>Eliminar solo este evento</AlertDialogAction>
                        <AlertDialogAction onClick={() => handleConfirmDelete('future')} variant="destructive">Eliminar este y futuros</AlertDialogAction>
                    </AlertDialogFooter>
                ) : (
                     <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleConfirmDelete('single')} variant="destructive">Confirmar Borrado</AlertDialogAction>
                    </AlertDialogFooter>
                )}
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
                         {editingEvent ? "Modifica los detalles del evento." : "Crea una nueva tarea para uno o varios miembros del personal."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[90vh] overflow-y-auto pr-6">
                    <div className="space-y-2">
                        <Label htmlFor="title">Tarea</Label>
                        <Select onValueChange={setNewEventTitle} value={newEventTitle}>
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tarea" />
                            </SelectTrigger>
                            <SelectContent>
                                {allCategories.map(task => <SelectItem key={task.id} value={task.name}>{task.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Descripción (Opcional)</Label>
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

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="technician">Personal</Label>
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start">
                                        <Users className="mr-2 h-4 w-4" />
                                        {newEventTechnicianIds.length === 0 && "Seleccionar personal"}
                                        {newEventTechnicianIds.length === 1 && allTechnicians.find(t => t.id === newEventTechnicianIds[0])?.name}
                                        {newEventTechnicianIds.length > 1 && `${newEventTechnicianIds.length} personas seleccionadas`}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-full">
                                    {allTechnicians.map(tech => (
                                        <DropdownMenuItem key={tech.id} onSelect={(e) => e.preventDefault()}>
                                            <div className="flex items-center space-x-2">
                                                <Checkbox
                                                    id={`tech-check-${tech.id}`}
                                                    checked={newEventTechnicianIds.includes(tech.id)}
                                                    onCheckedChange={(checked) => {
                                                        setNewEventTechnicianIds(prev => 
                                                            checked ? [...prev, tech.id] : prev.filter(id => id !== tech.id)
                                                        )
                                                    }}
                                                />
                                                <Label htmlFor={`tech-check-${tech.id}`}>{tech.name}</Label>
                                            </div>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
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
        {/* Agenda & Technicians Column */}
        <div className="flex flex-col gap-4 overflow-y-hidden">
            <Card className="flex flex-col bg-muted/30 h-1/2">
                <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="font-headline text-base flex items-center gap-2">
                        <CalendarDays className="w-5 h-5" />
                        Agenda del Día
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto">
                     <ScrollArea className="h-full p-1">
                        {Object.keys(groupedVisibleEvents).length > 0 ? (
                           <Accordion type="single" collapsible className="w-full">
                             {Object.entries(groupedVisibleEvents).map(([title, events]) => (
                                 <AccordionItem value={title} key={title}>
                                     <AccordionTrigger className="text-sm font-semibold px-2 py-2 hover:no-underline hover:bg-background/80 rounded-md">
                                        <span className="truncate">{title}</span>
                                        <Badge variant="secondary" className="ml-2">{events.length}</Badge>
                                     </AccordionTrigger>
                                     <AccordionContent className="pl-4 pr-1 space-y-1">
                                         {events.map(event => (
                                             <button 
                                                 key={event.id} 
                                                 onClick={() => handleAgendaItemClick(event)}
                                                 className={cn(
                                                     "w-full text-left p-2 rounded-md hover:bg-background transition-colors text-xs",
                                                     selectedEvent?.id === event.id && "bg-primary/10 text-primary font-medium"
                                                 )}
                                             >
                                                 <p className="text-muted-foreground">
                                                     {format(event.start, 'h:mm a', { locale: es })} - {allTechnicians.find(t => t.id === event.technicianId)?.name.split(' ')[0] || 'N/A'}
                                                 </p>
                                             </button>
                                         ))}
                                     </AccordionContent>
                                 </AccordionItem>
                             ))}
                            </Accordion>
                        ) : (
                            <p className="text-sm text-muted-foreground p-4 text-center">¡No hay eventos programados!</p>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
             <Card className="flex flex-col bg-muted/30 h-1/2">
                <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                  <CardTitle className="font-headline text-base">Servicios Generales</CardTitle>
                  {selectedTechnicianId && (
                     <Button variant="ghost" size="sm" onClick={() => setSelectedTechnicianId(null)}>
                        <Eye className="mr-2 h-4 w-4"/> Ver Todos
                     </Button>
                  )}
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto">
                  {allTechnicians.length > 0 ? allTechnicians.map(tech => (
                    <button 
                        key={tech.id} 
                        onClick={() => setSelectedTechnicianId(tech.id)}
                        className={cn(
                            "flex items-center gap-3 p-2 rounded-md hover:bg-background/80 w-full text-left",
                            selectedTechnicianId === tech.id && "bg-primary/10"
                        )}
                    >
                         <Avatar className="h-10 w-10 border-2" style={{ borderColor: generateColorFromString(tech.id, tech.name) }}>
                            <AvatarImage src={tech.avatar} alt={tech.name} />
                            <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-semibold text-sm">{tech.name}</p>
                        </div>
                    </button>
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
                      >
                        {/* Events for this technician on this day */}
                        {eventsByTechnicianAndDay(tech.id, date).map(event => (
                            <EventCard 
                                key={event.id} 
                                event={event} 
                                color={generateColorFromString(tech.id, tech.name)} 
                                onClick={() => handleEventClick(event)}
                                onEdit={(e) => handleEditEvent(e, event)}
                                onDelete={(e) => handleDeleteClick(e, event)}
                                isSelected={selectedEvent?.id === event.id}
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

    