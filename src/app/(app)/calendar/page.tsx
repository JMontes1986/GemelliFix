
'use client';

import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
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
import { technicians, scheduleEvents, tickets as unassignedTicketsData } from '@/lib/data';
import type { Technician, ScheduleEvent, Ticket } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const technician = technicians.find(t => t.id === event.technicianId);
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
        'absolute w-[95%] left-1/2 -translate-x-1/2 p-2 rounded-lg border text-xs shadow-sm cursor-pointer hover:shadow-md transition-all z-10',
        technician?.color || 'bg-secondary text-secondary-foreground'
      )}
      style={{
        top: `${top}px`,
        height: `${height}px`,
      }}
      draggable
      onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", event.ticketId || event.id);
          console.log("Dragging event:", event.title)
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
        e.dataTransfer.setData("text/plain", ticket.id);
        console.log("Dragging ticket:", ticket.code);
      }}
    >
      <p className="font-semibold text-sm">{ticket.code}</p>
      <p className="text-xs text-muted-foreground">{ticket.title}</p>
    </div>
);


export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date('2025-05-19'));
    const [events, setEvents] = useState<ScheduleEvent[]>(scheduleEvents);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>(unassignedTicketsData.filter(t => !t.assignedTo));

    const handleDrop = (technicianId: string, day: Date, time: string) => {
        console.log(`Dropped on ${technicianId} at ${day.toDateString()}, ${time}`);
    };
    
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1); // Start on Monday
    const weekDates = Array.from({ length: 5 }, (_, i) => {
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


  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            Calendario Operativo
          </h1>
          <p className="text-muted-foreground">
            Semana del 19 al 25 de Mayo, 2025
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

      <div className="flex-1 grid grid-cols-[240px_1fr] gap-4 overflow-hidden">
        {/* Unassigned & Technicians Column */}
        <div className="flex flex-col gap-4">
            <Card className="flex flex-col bg-muted/30  h-1/2">
                <CardHeader className="py-3 px-4 border-b">
                    <CardTitle className="font-headline text-base">Tickets sin Asignar</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto"
                    onDragOver={(e) => e.preventDefault()}
                >
                    {unassignedTickets.map((ticket) => (
                    <UnassignedTicketCard key={ticket.id} ticket={ticket} />
                    ))}
                </CardContent>
            </Card>
             <Card className="flex flex-col bg-muted/30 h-1/2">
                <CardHeader className="py-3 px-4 border-b">
                  <CardTitle className="font-headline text-base">Servicios Generales</CardTitle>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto">
                  {technicians.map(tech => (
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
                  ))}
                </CardContent>
            </Card>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto border rounded-lg bg-background">
          <div className="grid grid-cols-[60px_repeat(5,1fr)] sticky top-0 bg-background z-20 shadow-sm">
            <div className="p-2 border-b border-r"></div>
            {weekDates.map(date => (
              <div key={date.toString()} className="p-2 text-center border-b border-r font-semibold">
                  <p>{weekDays[date.getDay()]}</p>
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
            <div className="grid grid-cols-5 h-full">
                 {weekDates.map((date) => (
                    <div key={date.toString()} className="border-r relative">
                         {hours.map((_, hourIndex) => (
                             <div key={hourIndex} className="h-16 border-b" />
                         ))}
                         {/* Events for this day */}
                         {Object.values(eventsByTechnicianAndDay).flatMap(techEvents => techEvents[date.toDateString()] || []).map(event => (
                            <EventCard key={event.id} event={event} />
                         ))}
                    </div>
                 ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
