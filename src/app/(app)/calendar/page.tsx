'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Wrench,
  Cog,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Textarea } from '@/components/ui/textarea';
import { technicians, scheduleEvents, tickets as unassignedTicketsData } from '@/lib/data';
import type { Technician, ScheduleEvent, Ticket } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

const weekDays = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];
const timeSlots = Array.from({ length: 12 }, (_, i) => `${8 + i}:00`); // 8am to 7pm

const getEventStyle = (type: ScheduleEvent['type']) => {
  switch (type) {
    case 'ticket':
      return 'bg-destructive/80 border-destructive text-destructive-foreground';
    case 'task':
      return 'bg-secondary/80 border-secondary-foreground/50 text-secondary-foreground';
    case 'shift':
    default:
      return 'bg-primary/80 border-primary text-primary-foreground';
  }
};

const EventCard = ({ event }: { event: ScheduleEvent }) => (
  <div
    className={cn(
      'p-2 rounded-lg border text-xs shadow-sm mb-1 cursor-pointer hover:shadow-md transition-shadow',
      getEventStyle(event.type)
    )}
    // Placeholder for drag-and-drop
    draggable
    onDragStart={(e) => {
        // Here you would set the data to be transferred, e.g., the event or ticket ID
        e.dataTransfer.setData("text/plain", event.ticketId || event.id);
        console.log("Dragging event:", event.title)
    }}
  >
    <p className="font-bold truncate">{event.title}</p>
    <p className="truncate text-foreground/80">{event.description}</p>
    <p className="text-xs mt-1 text-foreground/60">
      {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(event.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
    </p>
  </div>
);

const UnassignedTicketCard = ({ ticket }: { ticket: Ticket }) => (
    <div
      className="p-2 rounded-lg border border-dashed bg-card text-card-foreground mb-2 cursor-grab"
      draggable
      onDragStart={(e) => {
        // Set the ticket id to be transferred on drag
        e.dataTransfer.setData("text/plain", ticket.id);
        console.log("Dragging ticket:", ticket.code);
      }}
    >
      <p className="font-semibold text-sm">{ticket.code}</p>
      <p className="text-xs text-muted-foreground">{ticket.title}</p>
    </div>
);


export default function CalendarPage() {
    const [events, setEvents] = useState<ScheduleEvent[]>(scheduleEvents);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>(unassignedTicketsData.filter(t => !t.assignedTo));

    const handleDrop = (technicianId: string, day: string, time: string) => {
        // Placeholder for drop logic
        // Here you would get the ticket/event ID from the data transfer
        // and update the events state accordingly.
        console.log(`Dropped on ${technicianId} at ${day}, ${time}`);
    };


  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            Calendario Operativo y Programación
          </h1>
          <p className="text-muted-foreground">
            Semana del 20 al 26 de Mayo, 2024
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
                        <Label htmlFor="technician" className="text-right">Técnico</Label>
                        <Select>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar técnico" />
                            </SelectTrigger>
                            <SelectContent>
                                {technicians.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
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

      <div className="flex-1 grid grid-cols-5 gap-2 overflow-x-auto">
        {/* Unassigned Tickets Column */}
        <div className="col-span-1">
             <Card className="flex flex-col h-full bg-muted/30">
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="font-headline text-base">Tickets sin Asignar</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto"
                  onDragOver={(e) => e.preventDefault()} // Allow drop
                >
                  {unassignedTickets.map((ticket) => (
                    <UnassignedTicketCard key={ticket.id} ticket={ticket} />
                  ))}
                </CardContent>
            </Card>
        </div>
        {/* Technicians Columns */}
        <div className="col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {technicians.map((tech) => (
            <Card key={tech.id} className="flex flex-col h-full">
              <CardHeader className="py-3 px-4 border-b">
                <div className="flex justify-between items-center">
                    <CardTitle className="font-headline text-base truncate">{tech.name}</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><MoreVertical className="h-4 w-4"/></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem>Ver Perfil</DropdownMenuItem>
                            <DropdownMenuItem>Asignar Tarea</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-2 pt-1">
                    <Progress value={tech.workload} className="h-2"/>
                    <span className="text-xs font-semibold text-muted-foreground">{tech.workload}%</span>
                </div>

              </CardHeader>
              <CardContent
                className="p-2 flex-1 overflow-y-auto"
                onDragOver={(e) => e.preventDefault()} // Allow drop
                onDrop={(e) => {
                    e.preventDefault();
                    // This is a simplified drop handler.
                    // In a real app, you would determine the day and time slot based on drop position.
                    handleDrop(tech.id, 'Lunes', '09:00');
                }}
              >
                {events
                  .filter((e) => e.technicianId === tech.id)
                  .map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

    