
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


const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const hours = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`); // 8am to 8pm

const EventCard = ({ event }: { event: ScheduleEvent }) => {
  const technician = technicians.find(t => t.id === event.technicianId);
  
  // Calculate top and height based on event start/end times
  const startHour = event.start.getHours();
  const startMinutes = event.start.getMinutes();
  const endHour = event.end.getHours();
  const endMinutes = event.end.getMinutes();

  const totalStartMinutes = (startHour - 8) * 60 + startMinutes;
  const totalEndMinutes = (endHour - 8) * 60 + endMinutes;

  const durationMinutes = totalEndMinutes - totalStartMinutes;

  // Assuming each hour slot is 64px (h-16) high
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
    const [events, setEvents] = useState<ScheduleEvent[]>(scheduleEvents);
    const [unassignedTickets, setUnassignedTickets] = useState<Ticket[]>(unassignedTicketsData.filter(t => !t.assignedTo));

    const handleDrop = (technicianId: string, day: string, time: string) => {
        console.log(`Dropped on ${technicianId} at ${day}, ${time}`);
    };
    
    // Create a mapping of technicians to their events for easier lookup
    const eventsByTechnician: Record<string, ScheduleEvent[]> = technicians.reduce((acc, tech) => {
        acc[tech.id] = events.filter(e => e.technicianId === tech.id);
        return acc;
    }, {} as Record<string, ScheduleEvent[]>);


  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">
            Calendario Operativo
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

      <div className="flex-1 grid grid-cols-[1fr_4fr] gap-4 overflow-hidden">
        {/* Unassigned Tickets Column */}
        <div className="flex flex-col">
             <Card className="flex flex-col h-full bg-muted/30">
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
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <div className="grid grid-cols-[100px_repeat(4,1fr)] sticky top-0 bg-background z-20">
            <div className="p-2 border-b border-r font-semibold">Técnicos</div>
            {weekDays.slice(0, 4).map(day => ( // Only show 4 days for space
              <div key={day} className="p-2 text-center border-b font-semibold">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-[100px_repeat(4,1fr)]">
             {/* Technician column */}
            <div className="border-r">
              {technicians.map(tech => (
                <div key={tech.id} className="h-48 border-b p-2 flex flex-col items-center justify-center text-center">
                   <Avatar>
                      <AvatarImage src={tech.avatar} alt={tech.name} />
                      <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  <p className="font-semibold text-sm mt-2">{tech.name}</p>
                  <p className="text-xs text-muted-foreground">{tech.workload}% Carga</p>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.slice(0, 4).map((day, dayIndex) => (
              <div key={day} className="grid grid-rows-1">
                {technicians.map(tech => (
                  <div 
                    key={tech.id} 
                    className="h-48 border-b relative"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(tech.id, day, 'N/A');
                    }}
                  >
                    {/* Render events for this technician on this day */}
                    {eventsByTechnician[tech.id]
                      ?.filter(event => new Date(event.start).getDay() === (dayIndex + 1) % 7) // Simple day check
                      .map(event => (
                        <EventCard key={event.id} event={event} />
                      ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
