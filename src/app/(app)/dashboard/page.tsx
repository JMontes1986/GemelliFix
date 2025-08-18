
'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarPlus,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { tickets } from '@/lib/data';
import Link from 'next/link';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';

const slaComplianceData = [
  { status: 'en_tiempo', count: 85, fill: 'var(--color-en_tiempo)' },
  { status: 'en_riesgo', count: 10, fill: 'var(--color-en_riesgo)' },
  { status: 'vencido', count: 5, fill: 'var(--color-vencido)' },
];

const slaComplianceConfig = {
  count: {
    label: 'Tickets',
  },
  en_tiempo: {
    label: 'En Tiempo',
    color: 'hsl(var(--chart-2))',
  },
  en_riesgo: {
    label: 'En Riesgo',
    color: 'hsl(var(--chart-4))',
  },
  vencido: {
    label: 'Vencido',
    color: 'hsl(var(--destructive))',
  },
} satisfies ChartConfig;

const ticketsByZoneData = [
    { zone: 'Bloque A', tickets: 12, fill: 'var(--color-bloque_a)' },
    { zone: 'Bloque B', tickets: 8, fill: 'var(--color-bloque_b)' },
    { zone: 'Admin', tickets: 5, fill: 'var(--color-admin)' },
    { zone: 'Comunes', tickets: 7, fill: 'var(--color-comunes)' },
];

const ticketsByZoneConfig = {
    tickets: {
        label: 'Tickets',
    },
    bloque_a: {
        label: 'Bloque A',
        color: 'hsl(var(--chart-1))',
    },
    bloque_b: {
        label: 'Bloque B',
        color: 'hsl(var(--chart-2))',
    },
    admin: {
        label: 'Admin',
        color: 'hsl(var(--chart-3))',
    },
    comunes: {
        label: 'Comunes',
        color: 'hsl(var(--chart-4))',
    },
} satisfies ChartConfig;

export default function DashboardPage() {
  const openTickets = tickets.filter(
    (t) => t.status === 'Abierto' || t.status === 'Asignado' || t.status === 'En Progreso'
  );
  const overdueTickets = tickets.filter((t) => new Date(t.dueDate) < new Date() && t.status !== 'Resuelto' && t.status !== 'Cerrado');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-headline font-bold tracking-tight">
          Dashboard de Líder
        </h1>
        <div className="flex items-center gap-2">
          <Link href="/calendar">
            <Button variant="secondary">
              <CalendarPlus className="mr-2 h-4 w-4" />
              Programar Turno
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abiertos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTickets.length}</div>
            <p className="text-xs text-muted-foreground">+2% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overdueTickets.length}</div>
            <p className="text-xs text-muted-foreground">+5% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento SLA</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">95%</div>
            <p className="text-xs text-muted-foreground">-1% desde el mes pasado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTTR (Horas)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8.2h</div>
            <p className="text-xs text-muted-foreground">Mejora de 0.5h</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="font-headline">Tickets por Zona</CardTitle>
            <CardDescription>Volumen de solicitudes en las últimas 4 semanas.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={ticketsByZoneConfig} className="h-[300px] w-full">
              <BarChart
                accessibilityLayer
                data={ticketsByZoneData}
                layout="vertical"
                margin={{ left: 10, right: 10 }}
              >
                <CartesianGrid horizontal={false} />
                <YAxis
                  dataKey="zone"
                  type="category"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 10)}
                  />
                <XAxis dataKey="tickets" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Bar dataKey="tickets" radius={5}>
                    {ticketsByZoneData.map((entry) => (
                        <Cell key={`cell-${entry.zone}`} fill={entry.fill} />
                    ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="font-headline">Cumplimiento de SLA</CardTitle>
            <CardDescription>Estado de los tickets cerrados este mes.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ChartContainer
              config={slaComplianceConfig}
              className="h-[300px] w-full max-w-[300px]"
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
                <Pie data={slaComplianceData} dataKey="count" nameKey="status" innerRadius={60}>
                    {slaComplianceData.map((entry) => (
                        <Cell key={`cell-${entry.status}`} fill={entry.fill} />
                    ))}
                </Pie>
                <ChartLegend
                  content={<ChartLegendContent nameKey="status" />}
                  className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tickets Urgentes y Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Asignado a</TableHead>
                <TableHead className="text-right">Vencimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets
                .filter(t => t.priority === 'Urgente' || t.priority === 'Alta')
                .slice(0, 5)
                .map((ticket) => (
                <TableRow key={ticket.id} className="cursor-pointer">
                  <TableCell>
                    <Link href={`/tickets/${ticket.id}`} className="font-medium text-primary hover:underline">{ticket.code}</Link>
                  </TableCell>
                  <TableCell>{ticket.title}</TableCell>
                  <TableCell>
                    <Badge variant={ticket.status === 'Abierto' ? 'destructive' : 'secondary'}>{ticket.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ticket.priority === 'Urgente' ? 'destructive' : 'default'} className={ticket.priority === 'Alta' ? 'bg-orange-500 text-white' : ''}>{ticket.priority}</Badge>
                  </TableCell>
                  <TableCell>{ticket.assignedTo || 'Sin asignar'}</TableCell>
                  <TableCell className="text-right">
                     <ClientFormattedDate date={ticket.dueDate} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
