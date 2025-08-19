
'use client';

import * as React from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Ticket, Clock, Check, ListFilter, Loader2 } from 'lucide-react';
import type { Notification, User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import Link from 'next/link';

const typeIcons = {
    ticket: <Ticket className="h-5 w-5" />,
    sla: <Clock className="h-5 w-5 text-destructive" />,
    schedule: <Bell className="h-5 w-5" />,
};

export default function NotificationsPage() {
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [currentUser, setCurrentUser] = React.useState<User | null>(null);
    const { toast } = useToast();

    React.useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
            if (user) {
                const userDocRef = doc(db, 'users', user.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setCurrentUser({ id: userDocSnap.id, ...userDocSnap.data() } as User);
                }
            } else {
                setCurrentUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    React.useEffect(() => {
        if (!currentUser) return;

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.id),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedNotifications: Notification[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                fetchedNotifications.push({
                    id: doc.id,
                    ...data
                } as Notification);
            });
            setNotifications(fetchedNotifications);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching notifications: ", error);
            toast({
                variant: 'destructive',
                title: 'Error al cargar notificaciones',
                description: 'No se pudieron obtener las notificaciones.'
            });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, toast]);

    const handleMarkAsRead = async (notificationId: string) => {
        const notificationRef = doc(db, 'notifications', notificationId);
        try {
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        const unreadNotifications = notifications.filter(n => !n.read);
        if (unreadNotifications.length === 0) return;

        const promises = unreadNotifications.map(n => {
            const notificationRef = doc(db, 'notifications', n.id);
            return updateDoc(notificationRef, { read: true });
        });

        try {
            await Promise.all(promises);
            toast({
                title: 'Notificaciones actualizadas',
                description: 'Todas las notificaciones han sido marcadas como leídas.'
            });
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
        }
    };

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-headline font-bold">Centro de Notificaciones</h1>
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
                    <DropdownMenuItem>No Leídas</DropdownMenuItem>
                    <DropdownMenuItem>Tipo: Ticket</DropdownMenuItem>
                    <DropdownMenuItem>Tipo: SLA</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="secondary" size="sm" className="h-7 gap-1" onClick={handleMarkAllAsRead}>Marcar todas como leídas</Button>
             </div>
        </div>
      
        <Card>
            <CardContent className="p-0">
            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center p-8 text-muted-foreground">
                    <Bell className="mx-auto h-12 w-12" />
                    <p className="mt-4">No tienes notificaciones nuevas.</p>
                </div>
            ) : (
                <ul className="divide-y divide-border">
                    {notifications.map((notification) => (
                    <li
                        key={notification.id}
                        className={cn(
                        'flex items-start gap-4 p-4',
                        !notification.read && 'bg-primary/5'
                        )}
                    >
                        <div className={cn("rounded-full h-10 w-10 flex items-center justify-center bg-muted", !notification.read && 'bg-primary/10 text-primary')}>
                            {typeIcons[notification.type]}
                        </div>
                        <div className="grid gap-1 flex-1">
                        <Link href={notification.linkTo || '#'} passHref>
                          <a className="font-semibold hover:underline">{notification.title}</a>
                        </Link>
                        <p className="text-sm text-muted-foreground">
                            {notification.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            <ClientFormattedDate date={notification.createdAt?.toDate()} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                        </p>
                        </div>
                        {!notification.read && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkAsRead(notification.id)}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Marcar como leída</span>
                        </Button>
                        )}
                    </li>
                    ))}
                </ul>
            )}
            </CardContent>
        </Card>
    </div>
  );
}
