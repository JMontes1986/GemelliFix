

import * as React from 'react';
import Link from 'next/link';
import {
  File,
  ListFilter,
  MoreHorizontal,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { tickets, zones, sites } from '@/lib/data';
import type { Ticket } from '@/lib/types';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';

const getPriorityBadgeVariant = (priority: Ticket['priority']) => {
  switch (priority) {
    case 'Urgente': return 'destructive';
    case 'Alta': return 'default'; // Should be orange, handled with className
    case 'Media': return 'secondary'; // Should be yellow, handled with className
    case 'Baja': return 'outline';
    default: return 'default';
  }
};

const getStatusBadgeVariant = (status: Ticket['status']) => {
  switch (status) {
    case 'Abierto': return 'destructive';
    case 'Asignado': return 'default';
    case 'En Progreso': return 'default';
    case 'Requiere Aprobación': return 'default';
    case 'Resuelto': return 'default'; 
    case 'Cerrado': return 'secondary';
    default: return 'default';
  }
};

const getStatusBadgeClassName = (status: Ticket['status']) => {
    switch (status) {
      case 'Asignado': return 'bg-blue-500 text-white';
      case 'En Progreso': return 'bg-yellow-500 text-black';
      case 'Requiere Aprobación': return 'bg-purple-500 text-white';
      case 'Resuelto': return 'bg-green-600 text-white';
      default: return '';
    }
}

const getPriorityBadgeClassName = (priority: Ticket['priority']) => {
    switch(priority) {
        case 'Alta': return 'bg-orange-500 text-white';
        case 'Media': return 'bg-yellow-400 text-black';
        default: return '';
    }
}

export default function TicketsPage() {
  const groupedTickets = tickets.reduce((acc, ticket) => {
    const { zone } = ticket;
    if (!acc[zone]) {
      acc[zone] = [];
    }
    acc[zone].push(ticket);
    return acc;
  }, {} as Record<string, Ticket[]>);

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="abierto">Abiertos</TabsTrigger>
          <TabsTrigger value="en_progreso">En Progreso</TabsTrigger>
          <TabsTrigger value="resuelto" className="hidden sm:flex">
            Resueltos
          </TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filtro
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Zona</DropdownMenuItem>
              <DropdownMenuItem>Prioridad</DropdownMenuItem>
              <DropdownMenuItem>Estado</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Exportar
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <Card>
          <CardHeader>
            <CardTitle className='font-headline'>Solicitudes de Mantenimiento</CardTitle>
            <CardDescription>
              Gestiona y monitorea todas las solicitudes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className='w-[180px]'>Código Ticket</TableHead>
                  <TableHead>Sitio</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Asignado a</TableHead>
                  <TableHead className="hidden md:table-cell">Creado</TableHead>
                  <TableHead className="hidden md:table-cell">Vence</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedTickets).map(([zone, ticketsInZone]) => (
                  <React.Fragment key={zone}>
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={9} className="font-bold font-headline text-primary">
                        {zone}
                      </TableCell>
                    </TableRow>
                    {ticketsInZone.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          <Link href={`/tickets/${ticket.id}`} className="text-primary hover:underline">
                            {ticket.code}
                          </Link>
                        </TableCell>
                        <TableCell>{ticket.site}</TableCell>
                        <TableCell>{ticket.title}</TableCell>
                        <TableCell>
                            <Badge variant={getPriorityBadgeVariant(ticket.priority)} className={getPriorityBadgeClassName(ticket.priority)}>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(ticket.status)} className={getStatusBadgeClassName(ticket.status)}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell>{ticket.assignedTo ?? 'Sin Asignar'}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <ClientFormattedDate date={ticket.createdAt} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <ClientFormattedDate date={ticket.dueDate} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                aria-haspopup="true"
                                size="icon"
                                variant="ghost"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>Ver Detalles</DropdownMenuItem>
                              <DropdownMenuItem>Asignar</DropdownMenuItem>
                              <DropdownMenuItem>Cambiar Estado</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
