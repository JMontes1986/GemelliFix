
'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarPlus,
  Sparkles,
  Users,
  MapPin,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip
} from "recharts"
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
import Link from 'next/link';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  analyzeDashboardData,
  type AnalyzeDashboardInput,
  type AnalyzeDashboardOutput,
} from '@/ai/flows/analyze-dashboard-data';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Ticket, User } from '@/lib/types';
import { GemelliFixLogo } from '@/components/icons';
import { Progress } from '@/components/ui/progress';


function AiAnalysisDialog({ open, onOpenChange, analysis, isLoading }: { open: boolean, onOpenChange: (open: boolean) => void, analysis: AnalyzeDashboardOutput | null, isLoading: boolean }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        Análisis del Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        El asistente de IA ha analizado los KPIs actuales de mantenimiento.
                    </DialogDescription>
                </DialogHeader>
                {isLoading && (
                    <div className="space-y-4 py-4">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                )}
                {analysis && (
                    <div
                        className="prose prose-sm prose-p:text-muted-foreground"
                        dangerouslySetInnerHTML={{ __html: analysis.summary }}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}


export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAnalysisOpen, setAnalysisOpen] = React.useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeDashboardOutput | null>(null);
  const { toast } = useToast();

   React.useEffect(() => {
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();

        ticketsData.push({ ...data, id: doc.id, createdAt, dueDate } as Ticket);
      });
      setTickets(ticketsData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching tickets for dashboard: ", error);
      toast({
        variant: "destructive",
        title: "Error al Cargar Datos",
        description: "No se pudieron obtener los datos para el dashboard.",
      });
      setIsLoading(false);
    });
    
    const techQuery = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
    const unsubscribeTechs = onSnapshot(techQuery, (snapshot) => {
        const techData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setTechnicians(techData);
    });
    
    return () => {
      unsubscribe();
      unsubscribeTechs();
    };
  }, [toast]);

  const openTickets = tickets.filter(t => t.status !== 'Cerrado' && t.status !== 'Resuelto').length;
  const overdueTickets = tickets.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Cerrado' && t.status !== 'Resuelto').length;
  
  const closedTickets = tickets.filter(t => t.status === 'Cerrado' || t.status === 'Resuelto');
  const slaCompliance = closedTickets.length > 0
    ? Math.round((closedTickets.filter(t => new Date(t.resolvedAt || t.dueDate) <= new Date(t.dueDate)).length / closedTickets.length) * 100)
    : 100;

  const resolutionTimes = closedTickets
    .map(t => {
        const resolvedAt = t.resolvedAt ? new Date(t.resolvedAt).getTime() : new Date().getTime();
        const createdAt = new Date(t.createdAt).getTime();
        return resolvedAt - createdAt;
    })
    .filter(time => !isNaN(time));
    
  const averageResolutionTime = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;
  const mttrHours = Math.round(averageResolutionTime / (1000 * 60 * 60));


  const ticketsByZoneData = Object.entries(
    tickets.reduce((acc, ticket) => {
      const zoneName = ticket.zone || "Sin Zona";
      acc[zoneName] = (acc[zoneName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, total]) => ({ name, total }));
  
  const calculateSlaByPriority = (priority: Ticket['priority']): number => {
    const priorityTickets = closedTickets.filter(t => t.priority === priority);
    if (priorityTickets.length === 0) return 100;
    const compliantTickets = priorityTickets.filter(t => new Date(t.resolvedAt || t.dueDate) <= new Date(t.dueDate));
    return Math.round((compliantTickets.length / priorityTickets.length) * 100);
  };

  const slaByPriority = {
      Urgente: calculateSlaByPriority('Urgente'),
      Alta: calculateSlaByPriority('Alta'),
      Media: calculateSlaByPriority('Media'),
      Baja: calculateSlaByPriority('Baja'),
  };

  const handleAnalysis = async () => {
    setAnalysisOpen(true);
    setIsLoadingAnalysis(true);
    setAnalysisResult(null);

    const input: AnalyzeDashboardInput = {
        openTickets: openTickets,
        overdueTickets: overdueTickets,
        slaCompliance: slaCompliance,
        averageResolutionTimeHours: mttrHours
    };

    try {
        const result = await analyzeDashboardData(input);
        setAnalysisResult(result);
    } catch (error) {
        console.error("Error getting AI analysis:", error);
        toast({
            variant: "destructive",
            title: "Error de IA",
            description: "No se pudo obtener el análisis del asistente de IA.",
        });
        setAnalysisOpen(false);
    } finally {
        setIsLoadingAnalysis(false);
    }
  }


  return (
    <div className="flex flex-col gap-4">
      <AiAnalysisDialog open={isAnalysisOpen} onOpenChange={setAnalysisOpen} analysis={analysisResult} isLoading={isLoadingAnalysis} />
      <div className="flex justify-center mb-4">
        <GemelliFixLogo className="w-48" />
      </div>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-headline font-bold tracking-tight">
          Dashboard de Líder
        </h1>
        <div className="flex items-center gap-2">
           <Button onClick={handleAnalysis} variant="outline" disabled={isLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              Analizar con IA
            </Button>
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
             {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{openTickets}</div>}
            <p className="text-xs text-muted-foreground">Datos en tiempo real</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{overdueTickets}</div>}
            <p className="text-xs text-muted-foreground">Datos en tiempo real</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento SLA</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{slaCompliance}%</div>}
            <p className="text-xs text-muted-foreground">Promedio de tickets cerrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MTTR (Horas)</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{mttrHours}h</div>}
            <p className="text-xs text-muted-foreground">Tiempo medio de resolución</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Tickets por Zona</CardTitle>
            <CardDescription>Volumen de solicitudes activas por cada zona.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ticketsByZoneData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: 'var(--radius)'
                    }}
                  />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Cumplimiento de SLA por Prioridad</CardTitle>
            <CardDescription>Rendimiento del equipo según la urgencia del ticket.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <div className="space-y-4 h-full flex flex-col justify-center">
                  {Object.entries(slaByPriority).map(([priority, value]) => (
                      <div key={priority} className="space-y-1">
                          <div className="flex justify-between items-center text-sm">
                            <span className="font-medium">{priority}</span>
                            <span className="text-muted-foreground font-semibold">{value}%</span>
                          </div>
                          <Progress value={value} aria-label={`Cumplimiento de SLA para prioridad ${priority}`} />
                      </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
          <CardTitle className="font-headline">Tickets Recientes</CardTitle>
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
              {isLoading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Skeleton className="h-8 w-full" />
                    </TableCell>
                </TableRow>
              ) : tickets.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        No hay tickets para mostrar.
                    </TableCell>
                </TableRow>
              ) : (
                tickets
                    .slice(0, 5) // Show only latest 5
                    .map((ticket) => (
                    <TableRow key={ticket.id} className="cursor-pointer" onClick={() => window.location.href=`/tickets/${ticket.id}`}>
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
                    <TableCell>{Array.isArray(ticket.assignedTo) && ticket.assignedTo.length > 0 ? ticket.assignedTo.join(', ') : 'Sin asignar'}</TableCell>
                    <TableCell className="text-right">
                        <ClientFormattedDate date={ticket.dueDate} options={{ day: 'numeric', month: 'numeric', year: 'numeric' }} />
                    </TableCell>
                    </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
