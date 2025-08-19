
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import type { Log } from '@/lib/types';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import Link from 'next/link';

const getActionBadgeVariant = (action: Log['action']) => {
    if (action.startsWith('update')) return 'secondary';
    if (action === 'login') return 'default';
    return 'outline';
}

export default function LogsPage() {
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    
    React.useEffect(() => {
        const q = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedLogs: Log[] = [];
            querySnapshot.forEach((doc) => {
                fetchedLogs.push({ id: doc.id, ...doc.data() } as Log);
            });
            setLogs(fetchedLogs);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Logs de Auditoría del Sistema</CardTitle>
                <CardDescription>
                    Aquí se muestra un registro cronológico de las acciones importantes realizadas en la plataforma.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Detalles</TableHead>
                            <TableHead className="text-right">Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No hay registros de logs para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold">{log.userName}</div>
                                        <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getActionBadgeVariant(log.action)}>
                                            {log.action.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {log.details.ticketCode ? (
                                            <>
                                                Ticket <Link href={`/tickets/${log.details.ticketId}`} className="text-primary hover:underline">{log.details.ticketCode}</Link>
                                                {log.details.field && <span> - Campo: {log.details.field}</span>}
                                                {log.details.oldValue && <span>, Antes: '{log.details.oldValue}'</span>}
                                                {log.details.newValue && <span>, Ahora: '{log.details.newValue}'</span>}
                                            </>
                                        ) : (
                                            log.action === 'login' && 'Inicio de sesión exitoso.'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ClientFormattedDate date={log.timestamp?.toDate()} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

