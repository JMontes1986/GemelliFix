
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
} from 'lucide-react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

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
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { User } from '@/lib/types';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);

  React.useEffect(() => {
    setIsMounted(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            try {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
                } else {
                    console.warn("User data not found in Firestore, logging out.");
                    await auth.signOut();
                    router.push('/login');
                }
            } catch (error) {
                 console.error("Error fetching user data:", error);
                 await auth.signOut();
                 router.push('/login');
            }
        } else {
            router.push('/login');
        }
        setIsLoadingUser(false);
    });

    return () => unsubscribe();
  }, [router]);
  
  const isActive = (path: string) => pathname === path;
  const showFab = isMounted && pathname !== '/tickets/create';

  if (isLoadingUser) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  if (!currentUser) {
    // This case should be handled by the redirect in onAuthStateChanged,
    // but as a fallback, we can return null or a loading state.
    return null;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {currentUser.email === 'sistemas@colgemelli.edu.co' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/dashboard')}
                    tooltip="Dashboard"
                  >
                    <Link href="/dashboard">
                      <LayoutDashboard />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            )}
             {currentUser.role === 'Administrador' && (
              <>
                 <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive('/diagnosis')}
                    tooltip="Diagnóstico"
                  >
                    <Link href="/diagnosis">
                      <HeartPulse />
                      <span>Diagnóstico</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </>
            )}
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/tickets') || pathname.startsWith('/tickets/')}
                tooltip="Solicitudes"
              >
                <Link href="/tickets">
                  <Wrench />
                  <span>Solicitudes</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/calendar')}
                tooltip="Calendario"
              >
                <Link href="/calendar">
                  <Calendar />
                  <span>Calendario</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive('/notifications')}
                tooltip="Notificaciones"
              >
                <Link href="/notifications">
                  <Bell />
                  <span>Notificaciones</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
             {currentUser.role === 'Administrador' && (
                <SidebarMenuItem>
                <SidebarMenuButton
                    asChild
                    isActive={isActive('/settings')}
                    tooltip="Configuración"
                >
                    <Link href="/settings">
                    <Settings />
                    <span>Configuración</span>
                    </Link>
                </SidebarMenuButton>
                </SidebarMenuItem>
             )}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive('/profile')} tooltip="Perfil">
                <Link href="/profile">
                  <UserIcon />
                  <span>Mi Perfil</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <Link href="/login">
                  <LogOut />
                  <span>Cerrar Sesión</span>
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
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configuración</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
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
