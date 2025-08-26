

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
  LineChart,
  Grid,
  TrendingUp,
  Star,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Line as RechartsLine,
  LineChart as RechartsLineChart,
  CartesianGrid,
  Legend,
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
import { startOfWeek, format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';


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
                <ScrollArea className="max-h-[60vh] pr-6 -mr-6">
                    {isLoading && (
                        <div className="space-y-4 py-4">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    )}
                    {analysis && (
                    <div className="prose prose-sm max-w-full text-muted-foreground py-4">
                            <ReactMarkdown
                                components={{
                                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                    ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                                    li: ({node, ...props}) => <li className="text-muted-foreground" {...props} />,
                                }}
                            >
                                {analysis.summary}
                            </ReactMarkdown>
                        </div>
                    )}
                </ScrollArea>
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

const formatHours = (hours: number): string => {
    if (hours < 24) {
        return `${Math.round(hours)}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return `${days}d ${remainingHours}h`;
};


export default function DashboardPage() {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [technicians, setTechnicians] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isAnalysisOpen, setAnalysisOpen] = React.useState(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisResult, setAnalysisResult] = React.useState<AnalyzeDashboardOutput | null>(null);
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const router = useRouter();


  React.useEffect(() => {
    setIsLoading(true);

     const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
                    setCurrentUser(userData);

                    if (userData.role !== 'Administrador' && userData.role !== 'SST') {
                        router.push('/tickets');
                        return;
                    }

                    // Fetch Tickets
                    const qTickets = query(collection(db, 'tickets'));
                    const unsubscribeTickets = onSnapshot(qTickets, (querySnapshot) => {
                      const ticketsData: Ticket[] = [];
                      querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
                        const dueDate = data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : new Date().toISOString();
                        const resolvedAt = data.resolvedAt?.toDate ? data.resolvedAt.toDate().toISOString() : undefined;
                        
                        ticketsData.push({ ...data, id: doc.id, createdAt, dueDate, resolvedAt } as Ticket);
                      });
                      setTickets(ticketsData);
                      if (technicians.length > 0 || userData.role === 'SST') setIsLoading(false);
                    }, (error) => {
                      console.error("Error fetching tickets for dashboard: ", error);
                      toast({
                        variant: "destructive",
                        title: "Error al Cargar Datos",
                        description: "No se pudieron obtener los datos para el dashboard.",
                      });
                      setIsLoading(false);
                    });

                    // Fetch Technicians only for Admins
                    if (userData.role === 'Administrador') {
                        const qTechnicians = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
                        const unsubscribeTechnicians = onSnapshot(qTechnicians, (querySnapshot) => {
                            const techData: User[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
                            setTechnicians(techData);
                            setIsLoading(false);
                        }, (error) => {
                            console.error("Error fetching technicians:", error);
                            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el personal de Servicios Generales.' });
                            setIsLoading(false);
                        });
                        return () => unsubscribeTechnicians();
                    } else {
                        setIsLoading(false); // For SST, loading is done.
                    }

                    return () => unsubscribeTickets();

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
    
    return () => {
        unsubscribeAuth();
    };
  }, [toast, router]);

  const openTickets = tickets.filter(t => t.status !== 'Cerrado' && t.status !== 'Resuelto' && t.status !== 'Cancelado').length;
  
  const closedTickets = tickets.filter(t => t.status === 'Cerrado' || t.status === 'Resuelto');
  
  const slaCompliantTickets = closedTickets.filter(t => 
    t.resolvedAt && new Date(t.resolvedAt) <= new Date(t.dueDate)
  );

  const slaCompliance = closedTickets.length > 0
    ? Math.round((slaCompliantTickets.length / closedTickets.length) * 100)
    : 100;
    
  const overdueTickets = tickets.filter(t => {
      if (t.status === 'Cerrado' || t.status === 'Resuelto' || t.status === 'Cancelado') {
          return false;
      }
      return new Date() > new Date(t.dueDate);
  }).length;

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
  
  const satisfactionRatings = tickets
    .map(t => t.satisfactionRating)
    .filter((rating): rating is number => typeof rating === 'number' && rating > 0);
  
  const averageSatisfaction = satisfactionRatings.length > 0
    ? (satisfactionRatings.reduce((a, b) => a + b, 0) / satisfactionRatings.length).toFixed(1)
    : 'N/A';
  const satisfactionResponseCount = satisfactionRatings.length;


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

   const ticketsByCategoryData = Object.entries(
    tickets.reduce((acc, ticket) => {
      const categoryName = ticket.category || "Sin Categoría";
      acc[categoryName] = (acc[categoryName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, total]) => ({ name, total }))
   .sort((a,b) => b.total - a.total)
   .slice(0, 5);


  const calculateSlaByPriority = (priority: Ticket['priority']): number => {
    const relevantTickets = tickets.filter(t => t.priority === priority);
    if (relevantTickets.length === 0) {
        return 100; // Si no hay tickets, el cumplimiento es del 100%
    }
    
    // Contar incumplimientos: 1. Cerrados tarde, 2. Abiertos y ya vencidos.
    const nonCompliantCount = relevantTickets.filter(t => {
        const isClosed = t.status === 'Cerrado' || t.status === 'Resuelto';
        const isOverdue = new Date() > new Date(t.dueDate);
        
        // Incumplimiento si se cerró y tiene fecha de resolución posterior al vencimiento.
        if (isClosed && t.resolvedAt) {
            return new Date(t.resolvedAt) > new Date(t.dueDate);
        }
        
        // Incumplimiento si no está cerrado y ya está vencido.
        if (!isClosed && isOverdue) {
            return true;
        }

        return false;
    }).length;

    const compliantCount = relevantTickets.length - nonCompliantCount;
    
    return Math.round((compliantCount / relevantTickets.length) * 100);
  };

  const slaByPriority = {
      Urgente: calculateSlaByPriority('Urgente'),
      Alta: calculateSlaByPriority('Alta'),
      Media: calculateSlaByPriority('Media'),
      Baja: calculateSlaByPriority('Baja'),
  };

  const ticketTrendsData = React.useMemo(() => {
    const weeklyData: { [week: string]: { created: number, closed: number, overdue: number } } = {};

    tickets.forEach(ticket => {
        const createdAt = parseISO(ticket.createdAt);
        const weekStart = startOfWeek(createdAt, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');

        // Initialize the week if it doesn't exist
        if (!weeklyData[weekKey]) {
            weeklyData[weekKey] = { created: 0, closed: 0, overdue: 0 };
        }

        // Increment created count for the creation week
        weeklyData[weekKey].created++;
        
        // If the ticket is closed, increment the closed count for its creation week
        if (ticket.resolvedAt) {
            weeklyData[weekKey].closed++;
        }

        // If the ticket is currently overdue, increment the overdue count for its creation week
        if (new Date() > new Date(ticket.dueDate) && ticket.status !== 'Cerrado' && ticket.status !== 'Resuelto' && ticket.status !== 'Cancelado') {
            weeklyData[weekKey].overdue++;
        }
    });

    return Object.entries(weeklyData)
        .map(([week, data]) => ({
            week: format(parseISO(week), "dd LLL", { locale: es }),
            ...data
        }))
        .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());
  }, [tickets]);

  const lifecycleData = React.useMemo(() => {
    const durations = {
      toAssignment: [] as number[],
      toInProgress: [] as number[],
      toResolved: [] as number[],
    };

    tickets.forEach(ticket => {
      const history = ticket.statusHistory;
      if (!history) return;

      const createdAt = new Date(ticket.createdAt).getTime();
      const assignedAt = history.Asignado ? new Date(history.Asignado).getTime() : null;
      const inProgressAt = history['En Progreso'] ? new Date(history['En Progreso']).getTime() : null;
      const resolvedAt = history.Resuelto ? new Date(history.Resuelto).getTime() : null;
      
      if (assignedAt) {
        durations.toAssignment.push((assignedAt - createdAt) / (1000 * 3600));
      }
      if (inProgressAt && assignedAt) {
        durations.toInProgress.push((inProgressAt - assignedAt) / (1000 * 3600));
      }
      if (resolvedAt && inProgressAt) {
        durations.toResolved.push((resolvedAt - inProgressAt) / (1000 * 3600));
      }
    });

    const getAverage = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    return [
      { name: 'Abierto → Asignado', time: getAverage(durations.toAssignment) },
      { name: 'Asignado → En Progreso', time: getAverage(durations.toInProgress) },
      { name: 'En Progreso → Resuelto', time: getAverage(durations.toResolved) },
    ];
  }, [tickets]);

  const productivityData = React.useMemo(() => {
    const techStats: { [id: string]: { name: string, avatar: string, resolvedCount: number, totalTime: number } } = {};

    technicians.forEach(tech => {
        techStats[tech.id] = { name: tech.name, avatar: tech.avatar, resolvedCount: 0, totalTime: 0 };
    });

    closedTickets.forEach(ticket => {
        if (ticket.assignedToIds && ticket.resolvedAt) {
            const resolutionTime = new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime();
            ticket.assignedToIds.forEach(techId => {
                if (techStats[techId]) {
                    techStats[techId].resolvedCount++;
                    techStats[techId].totalTime += resolutionTime;
                }
            });
        }
    });

    return Object.values(techStats).map(stat => ({
        ...stat,
        avgTime: stat.resolvedCount > 0 ? Math.round((stat.totalTime / stat.resolvedCount) / (1000 * 3600)) : 0
    })).sort((a, b) => b.resolvedCount - a.resolvedCount);
  }, [closedTickets, technicians]);


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
  
  if (isLoading || !currentUser) {
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
        <div>
            <h1 className="text-2xl font-headline font-bold tracking-tight">
                Sistema de Inteligencia de Mantenimiento (MIM)
            </h1>
            <p className="text-muted-foreground">
                Una vista centralizada de las operaciones de mantenimiento.
            </p>
        </div>
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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfacción</CardTitle>
            <Star className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Skeleton className="h-8 w-1/2" /> : <div className="text-2xl font-bold">{averageSatisfaction} / 5</div>}
            <p className="text-xs text-muted-foreground">Basado en {satisfactionResponseCount} respuestas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline flex items-center gap-2"><MapPin className="h-5 w-5"/>Tickets por Zona</CardTitle>
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
            <CardTitle className="font-headline flex items-center gap-2"><Users className="h-5 w-5"/>Top Solicitantes</CardTitle>
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
            <CardTitle className="font-headline flex items-center gap-2"><Grid className="h-5 w-5"/>Categorías con más Solicitudes</CardTitle>
            <CardDescription>Top 5 de categorías que generan más tickets.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ticketsByCategoryData} layout="vertical" margin={{ left: 20 }}>
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
                    {ticketsByCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[(index + 1) % COLORS.length]} /> // Offset colors
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-4 lg:grid-cols-2">
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
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Tiempo Promedio por Etapa</CardTitle>
                <CardDescription>Promedio de horas que un ticket pasa en cada fase hasta ser resuelto.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={lifecycleData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" unit="h" />
                            <YAxis dataKey="name" type="category" width={110} fontSize={12} />
                            <Tooltip 
                                formatter={(value: number) => [formatHours(value), 'Tiempo Promedio']}
                                cursor={{fill: 'hsl(var(--muted))'}}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--background))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                            />
                            <Bar dataKey="time" name="Horas" barSize={20}>
                                {lifecycleData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
      </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
            <CardHeader>
                <CardTitle className="font-headline">Tendencias de Tickets</CardTitle>
                <CardDescription>Evolución semanal del número de tickets creados, cerrados y vencidos.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsLineChart data={ticketTrendsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <Tooltip
                             contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: 'var(--radius)'
                            }}
                        />
                        <Legend />
                        <RechartsLine type="monotone" dataKey="created" name="Creados" stroke="#0088FE" strokeWidth={2} />
                        <RechartsLine type="monotone" dataKey="closed" name="Cerrados" stroke="#00C49F" strokeWidth={2} />
                        <RechartsLine type="monotone" dataKey="overdue" name="Vencidos" stroke="#FF8042" strokeWidth={2} />
                    </RechartsLineChart>
                </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
        {currentUser?.role !== 'SST' && (
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline flex items-center gap-2"><TrendingUp className="h-5 w-5" />Productividad de Equipo</CardTitle>
                    <CardDescription>Tickets resueltos y tiempo promedio por técnico.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? <Skeleton className="h-[300px] w-full" /> : (
                        <div className="space-y-4">
                            {productivityData.map(tech => (
                                <div key={tech.name} className="flex items-center">
                                    <Avatar className="h-9 w-9">
                                        <AvatarImage src={tech.avatar} />
                                        <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="ml-4 space-y-1">
                                        <p className="text-sm font-medium leading-none">{tech.name}</p>
                                        <p className="text-sm text-muted-foreground">{tech.resolvedCount} resueltos - {tech.avgTime}h prom.</p>
                                    </div>
                                    <div className="ml-auto font-medium">{tech.resolvedCount}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        )}
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
