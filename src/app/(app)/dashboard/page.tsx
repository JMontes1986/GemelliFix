

'use client';

import * as React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  CalendarPlus,
  Sparkles,
  MapPin,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell
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
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Ticket, User } from '@/lib/types';
import { GemelliFixLogo } from '@/components/icons';
import { Progress } from '@/components/ui/progress';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';


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

const getSlaProgressColor = (priority: string) => {
    switch(priority) {
        case 'Urgente': return 'bg-red-500';
        case 'Alta': return 'bg-orange-500';
        case 'Media': return 'bg-yellow-400';
        case 'Baja': return 'bg-green-500';
        default: return 'bg-primary';
    }
}


export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAnalysisOpen, setAnalysisOpen] = React.useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeDashboardOutput | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'tickets'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();
        const resolvedAt = data.resolvedAt?.toDate ? data.resolvedAt.toDate().toISOString() : undefined;

        ticketsData.push({ ...data, id: doc.id, createdAt, dueDate, resolvedAt } as Ticket);
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
    
    return () => unsubscribe();
  }, [toast]);

  const openTickets = tickets.filter(t => t.status !== 'Cerrado' && t.status !== 'Resuelto' && t.status !== 'Cancelado').length;
  const overdueTickets = tickets.filter(t => new Date(t.dueDate) < new Date() && t.status !== 'Cerrado' && t.status !== 'Resuelto' && t.status !== 'Cancelado').length;
  
  const closedTickets = tickets.filter(t => t.status === 'Cerrado' || t.status === 'Resuelto');
  
  const slaCompliantTickets = closedTickets.filter(t => 
    t.resolvedAt && new Date(t.resolvedAt) <= new Date(t.dueDate)
  );

  const slaCompliance = closedTickets.length > 0
    ? Math.round((slaCompliantTickets.length / closedTickets.length) * 100)
    : 100;

  const resolutionTimes = closedTickets
    .map(t => {
        if (!t.resolvedAt) return null;
        const resolvedAt = new Date(t.resolvedAt).getTime();
        const createdAt = new Date(t.createdAt).getTime();
        return resolvedAt - createdAt;
    })
    .filter((time): time is number => time !== null && !isNaN(time));
    
  const averageResolutionTime = resolutionTimes.length > 0 ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length : 0;
  const mttrHours = Math.round(averageResolutionTime / (1000 * 60 * 60));


  const ticketsByZoneData = Object.entries(
    tickets.reduce((acc, ticket) => {
      const zoneName = ticket.zone || "Sin Zona";
      acc[zoneName] = (acc[zoneName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, total]) => ({ name, total }));
  
  const topRequestersData = Object.entries(
    tickets.reduce((acc, ticket) => {
        const requesterName = ticket.requester || "Desconocido";
        acc[requesterName] = (acc[requesterName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)
  ).map(([name, total]) => ({ name, total }))
   .sort((a,b) => b.total - a.total)
   .slice(0, 5);


  const calculateSlaByPriority = (priority: Ticket['priority']): number => {
    const priorityTickets = tickets.filter(t => t.priority === priority);
    const closedPriorityTickets = priorityTickets.filter(t => t.status === 'Cerrado' || t.status === 'Resuelto');

    if (closedPriorityTickets.length === 0) {
        return 100;
    }

    const compliantTickets = closedPriorityTickets.filter(t => 
        t.resolvedAt && new Date(t.resolvedAt) <= new Date(t.dueDate)
    );

    return Math.round((compliantTickets.length / closedPriorityTickets.length) * 100);
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  if (isLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AiAnalysisDialog open={isAnalysisOpen} onOpenChange={setAnalysisOpen} analysis={analysisResult} isLoading={isLoadingAnalysis} />
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
            <Button>
              <CalendarPlus className="mr-2 h-4 w-4" />
              Programar
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
             {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{mttrHours}</div>}
            <p className="text-xs text-muted-foreground">Tiempo medio de resolución</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {ticketsByZoneData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Top Solicitantes</CardTitle>
            <CardDescription>Usuarios que más solicitudes han creado.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={topRequestersData} layout="vertical" margin={{ left: 20 }}>
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
                  <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                    {topRequestersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} /> // Offset colors
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Cumplimiento de SLA por Prioridad</CardTitle>
            <CardDescription>Rendimiento del equipo según la urgencia.</CardDescription>
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
                          <Progress value={value} indicatorClassName={getSlaProgressColor(priority)} aria-label={`Cumplimiento de SLA para prioridad ${priority}`} />
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
