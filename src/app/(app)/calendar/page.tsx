'use client'

import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { technicians } from '@/lib/data';

const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Mock events for the calendar
const events = [
    { techId: 'tech-1', day: 'Lunes', time: '9:00 AM', title: 'Ticket: GEMMAN-ZONAA-SITEA1-0001', type: 'ticket' },
    { techId: 'tech-1', day: 'Lunes', time: '2:00 PM', title: 'Turno de Tarde', type: 'shift' },
    { techId: 'tech-2', day: 'Martes', time: '10:00 AM', title: 'Cuadrante Aseo: Bloque B', type: 'task' },
    { techId: 'tech-3', day: 'Miércoles', time: '11:00 AM', title: 'Ticket: GEMMAN-ZONAC-SITEC2-0003', type: 'ticket' },
    { techId: 'tech-1', day: 'Jueves', time: 'Todo el día', title: 'Capacitación HVAC', type: 'shift' },
    { techId: 'tech-2', day: 'Viernes', time: '3:00 PM', title: 'Ticket: GEMMAN-ZONAD-SITED1-0004', type: 'ticket' },
];

export default function CalendarPage() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-headline font-bold">Calendario Operativo</h1>
          <p className="text-muted-foreground">Semana del 20 al 26 de Mayo, 2024</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Programar
          </Button>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {technicians.map((tech) => (
            <Card key={tech.id} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="font-headline text-base">{tech.name}</CardTitle>
                    <CardDescription>Carga: 75%</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-2 overflow-y-auto">
                    {events.filter(e => e.techId === tech.id).map(event => (
                         <div key={event.title} className="p-2 rounded-lg border bg-card text-card-foreground shadow-sm">
                            <p className="font-semibold text-sm">{event.title}</p>
                            <div className="flex justify-between items-center mt-1">
                                <p className="text-xs text-muted-foreground">{event.day}, {event.time}</p>
                                <Badge variant={event.type === 'ticket' ? 'destructive' : event.type === 'task' ? 'secondary' : 'default'} className="text-xs">
                                    {event.type === 'ticket' ? 'Ticket' : event.type === 'task' ? 'Tarea' : 'Turno'}
                                </Badge>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        ))}
         <Card className="flex flex-col border-dashed items-center justify-center">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-base text-muted-foreground">Tickets sin Asignar</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 space-y-2">
                 <div className="p-2 rounded-lg border border-dashed bg-card text-card-foreground">
                    <p className="font-semibold text-sm">GEMMAN-ZONAB-SITEB1-0002</p>
                    <p className="text-xs text-muted-foreground">Fuga en grifo</p>
                 </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
