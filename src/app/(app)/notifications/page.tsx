import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Ticket, Clock, Check } from 'lucide-react';
import { notifications } from '@/lib/data';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu';
  import { ListFilter } from 'lucide-react';


const typeIcons = {
    ticket: <Ticket className="h-5 w-5" />,
    sla: <Clock className="h-5 w-5 text-destructive" />,
    schedule: <Bell className="h-5 w-5" />,
};

export default function NotificationsPage() {
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
                <Button variant="secondary" size="sm" className="h-7 gap-1">Marcar todas como leídas</Button>
             </div>
        </div>
      
        <Card>
            <CardContent className="p-0">
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
                    <p className="font-semibold">{notification.title}</p>
                    <p className="text-sm text-muted-foreground">
                        {notification.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {notification.createdAt}
                    </p>
                    </div>
                    {!notification.read && (
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Marcar como leída</span>
                    </Button>
                    )}
                </li>
                ))}
            </ul>
            </CardContent>
        </Card>
    </div>
  );
}
