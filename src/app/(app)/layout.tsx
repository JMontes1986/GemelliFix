

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Calendar,
  Home,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Search,
  Settings,
  User as UserIcon,
  Wrench,
  PlusCircle,
  HeartPulse,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Star,
} from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, query, where, getDocs, limit, updateDoc, orderBy } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { GemelliFixLogo } from '@/components/icons';
import { cn } from '@/lib/utils';


import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { User, Ticket } from '@/lib/types';
import AiAssistant from './components/ai-assistant';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function CollapseToggle() {
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === 'collapsed';
    const Icon = isCollapsed ? ChevronsRight : ChevronsLeft;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="w-full justify-center bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
            onClick={toggleSidebar}
        >
            <Icon className="h-5 w-5" />
            <span className="sr-only">{isCollapsed ? 'Expandir' : 'Colapsar'}</span>
        </Button>
    )
}

function SatisfactionSurveyModal({
  ticket,
  isOpen,
  onClose,
}: {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (ticket) {
      setRating(0);
      setComment('');
    }
  }, [ticket]);

  if (!ticket) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const docRef = doc(db, 'tickets', ticket.id);
      await updateDoc(docRef, {
        satisfactionRating: rating > 0 ? rating : null,
        satisfactionComment: comment,
        satisfactionSurveyCompleted: true,
      });
      toast({ title: '¡Gracias por tus comentarios!', description: 'Tu opinión ha sido registrada.' });
      onClose(); // Cierra el modal y permite que el layout busque la siguiente encuesta
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar tu calificación.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline text-lg flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Encuesta de Satisfacción
          </DialogTitle>
          <DialogDescription>
            Por favor, califica el servicio recibido para el ticket: <strong>{ticket.code} - {ticket.title}</strong>
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-muted-foreground text-sm">Tu opinión es muy importante para nosotros. Califica de 1 a 5 estrellas la calidad del servicio recibido, donde 5 es excelente.</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map(star => (
              <Button key={star} variant={rating === star ? 'default' : 'outline'} size="icon" onClick={() => setRating(star)} disabled={isSubmitting}>
                {star}
              </Button>
            ))}
          </div>
          <div>
            <Label htmlFor="satisfaction-comment-modal">Comentarios Adicionales (Opcional)</Label>
            <Textarea
              id="satisfaction-comment-modal"
              placeholder="Tu opinión nos ayuda a mejorar..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <Button className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {rating === 0 ? 'Omitir y Enviar' : 'Enviar Calificación'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  
  // State for satisfaction survey modal
  const [pendingSurveyTicket, setPendingSurveyTicket] = React.useState<Ticket | null>(null);

  const fetchAndSetPendingSurvey = React.useCallback(async (user: User) => {
    if (user.role === 'Administrador') return; // Admins don't get surveys

    const q = query(
      collection(db, 'tickets'),
      where('requesterId', '==', user.uid),
      where('status', '==', 'Cerrado'),
      where('satisfactionSurveyCompleted', '==', false),
      orderBy('resolvedAt', 'asc'),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const ticketDoc = querySnapshot.docs[0];
      setPendingSurveyTicket({ id: ticketDoc.id, ...ticketDoc.data() } as Ticket);
    } else {
      setPendingSurveyTicket(null);
    }
  }, []);

  React.useEffect(() => {
    setIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        setIsLoadingUser(true);
        if (firebaseUser) {
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const userDocSnap = await getDoc(userDocRef);

              if (!userDocSnap.exists()) {
                  console.warn(`User document not found for UID: ${firebaseUser.uid}. Creating a new profile.`);
                  const newUser: User = {
                      id: firebaseUser.uid,
                      uid: firebaseUser.uid,
                      name: firebaseUser.displayName || firebaseUser.email || 'Nuevo Usuario',
                      email: firebaseUser.email || '',
                      avatar: firebaseUser.photoURL || `https://placehold.co/100x100.png`,
                      role: 'Docentes',
                  };
                  await setDoc(userDocRef, { ...newUser, createdAt: serverTimestamp() });
                  // Re-fetch after creation to ensure we have fresh data
                  const freshSnap = await getDoc(userDocRef);
                   if (!freshSnap.exists()) throw new Error("Failed to create and fetch user document.");
                   setCurrentUser({ id: freshSnap.id, ...freshSnap.data() } as User);

              } else {
                 const firestoreData = userDocSnap.data() as Omit<User, 'id'>;
                 const idTokenResult = await firebaseUser.getIdTokenResult(true);
                 const tokenRole = idTokenResult.claims.role as User['role'] | undefined;

                 const userData: User = { 
                     id: userDocSnap.id, 
                     ...firestoreData, 
                     // The token is the source of truth for the role.
                     // The Firestore role is a fallback.
                     role: tokenRole || firestoreData.role
                 };
                 setCurrentUser(userData);
                 await fetchAndSetPendingSurvey(userData);
              }

            } catch (error) {
              console.error("Error verifying user session or getting data. Logging out.", error);
              await auth.signOut();
              router.push('/login');
            }
        } else {
            router.push('/login');
        }
        setIsLoadingUser(false);
    });

    return () => unsubscribe();
  }, [router, fetchAndSetPendingSurvey]);
  
  const isActive = (path: string) => pathname === path;
  const showFab = isMounted && pathname !== '/tickets/create';
  
  if (isLoadingUser || !currentUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }
  
  const isAdmin = currentUser?.role === 'Administrador';
  const isServiceUser = currentUser?.role === 'Servicios Generales';
  const isSST = currentUser?.role === 'SST';

  return (
    <SidebarProvider defaultOpen={false}>
      <SatisfactionSurveyModal 
        isOpen={!!pendingSurveyTicket}
        ticket={pendingSurveyTicket}
        onClose={() => {
            setPendingSurveyTicket(null);
            if(currentUser) fetchAndSetPendingSurvey(currentUser); // Check for the next one
        }}
      />
      <Sidebar collapsible="icon">
        <SidebarHeader className="p-4 flex items-center justify-center">
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {(isAdmin || isSST) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard')}
                    tooltip="Dashboard"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span className="group-data-[collapsible=icon]:hidden">Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            {isAdmin && (
                 <SidebarMenuItem>
                    <SidebarMenuButton
                    asChild
                    isActive={isActive('/diagnosis')}
                    tooltip="Diagnóstico"
                    >
                    <Link href="/diagnosis">
                        <HeartPulse />
                        <span className="group-data-[collapsible=icon]:hidden">Diagnóstico</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/tickets') || pathname.startsWith('/tickets/')}
                tooltip="Solicitudes"
              >
                <Link href="/tickets">
                  <Wrench />
                  <span className="group-data-[collapsible=icon]:hidden">Solicitudes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            {(isAdmin || isServiceUser) && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/calendar')}
                  tooltip="Calendario"
                >
                  <Link href="/calendar">
                    <Calendar />
                    <span className="group-data-[collapsible=icon]:hidden">Calendario</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/notifications')}
                tooltip="Notificaciones"
              >
                <Link href="/notifications">
                  <Bell />
                  <span className="group-data-[collapsible=icon]:hidden">Notificaciones</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {isAdmin && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/settings')}
                    tooltip="Configuración"
                >
                    <Link href="/settings">
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Configuración</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
             )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
                <CollapseToggle />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/login" onClick={async () => await auth.signOut()}>
                  <LogOut />
                  <span className="group-data-[collapsible=icon]:hidden">Cerrar Sesión</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-lg px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
          <SidebarTrigger className="sm:hidden">
            <PanelLeft />
          </SidebarTrigger>
          <div className="relative ml-auto flex-1 md:grow-0">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="w-full rounded-lg bg-card pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Bell className="h-5 w-5" />
              <span className="sr-only">Notificaciones</span>
            </Button>
          </Link>
           <AiAssistant />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback>{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-headline">{currentUser.name}</div>
                <div className="text-xs text-muted-foreground font-normal">
                  {currentUser.email}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserIcon className="mr-2 h-4 w-4" />
                  <span>Perfil</span>
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem asChild>
                    <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                    </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild onClick={async () => await auth.signOut()}>
                <Link href="/login">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:px-6 sm:py-0 space-y-4">
          {children}
        </main>
         {showFab && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/tickets/create">
                  <Button
                    className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50"
                  >
                    <PlusCircle className="h-8 w-8" />
                    <span className="sr-only">Crear Nuevo Ticket</span>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="left">
                Crear Nuevo Ticket
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}
