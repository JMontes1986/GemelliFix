
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Package, Edit, Download } from 'lucide-react';
import type { Requisition } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const getStatusBadgeClass = (status: Requisition['status']) => {
    switch (status) {
        case 'Aprobada':
            return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'Completada':
            return 'bg-green-100 text-green-800 border-green-200';
        case 'Parcialmente Aprobada':
            return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'Rechazada':
            return 'bg-red-100 text-red-800 border-red-200';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-200';
    }
}


export default function RequisitionsListPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [requisitions, setRequisitions] = React.useState<Requisition[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'Administrador') {
          const q = query(collection(db, 'requisitions'), orderBy('createdAt', 'desc'));
          const unsubRequisitions = onSnapshot(q, (snapshot) => {
            setRequisitions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Requisition)));
            setIsLoading(false);
          }, (err) => {
            console.error("Error fetching requisitions:", err);
            setError("No se pudieron cargar las requisiciones.");
            setIsLoading(false);
          });
          return unsubRequisitions;
        } else {
          router.push('/dashboard');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);
  
  const handleExport = () => {
    if (requisitions.length === 0) {
        toast({
            title: "No hay datos para exportar",
            description: "La tabla de requisiciones está vacía.",
        });
        return;
    }

    const headers = [
        "Numero Requisicion", "Fecha Solicitud", "Solicitante", "Cargo", "Dependencia", 
        "Estado", "Item Cantidad", "Item Producto", "Item Descripcion", 
        "Item Autorizado", "Item Fecha Autorizacion", "Item Recibido", "Item Fecha Recepcion"
    ];
    
    const sanitizeForCsv = (value: any) => {
        if (value === null || value === undefined) return "";
        let str = String(value);
        if (str.search(/("|,|\n)/g) >= 0) {
            str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    
    const rows: string[] = [];
    requisitions.forEach(req => {
        req.items.forEach(item => {
             const row = [
                sanitizeForCsv(req.requisitionNumber),
                sanitizeForCsv(req.requestDate ? new Date(req.requestDate.toDate()).toLocaleDateString('es-CO') : ''),
                sanitizeForCsv(req.requesterName),
                sanitizeForCsv(req.requesterPosition),
                sanitizeForCsv(req.department),
                sanitizeForCsv(req.status || 'Pendiente'),
                sanitizeForCsv(item.quantity),
                sanitizeForCsv(item.product),
                sanitizeForCsv(item.description),
                sanitizeForCsv(item.authorized ? 'Si' : 'No'),
                sanitizeForCsv(item.authorizedAt ? new Date(item.authorizedAt.toDate()).toLocaleDateString('es-CO') : ''),
                sanitizeForCsv(item.received ? 'Si' : 'No'),
                sanitizeForCsv(item.receivedAt ? new Date(item.receivedAt.toDate()).toLocaleDateString('es-CO') : ''),
            ].join(',');
            rows.push(row);
        });
    });


    const csvContent = [headers.join(','), ...rows].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "requisitions.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    toast({ title: 'Exportación Iniciada', description: 'La descarga de tu archivo CSV ha comenzado.' });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline text-2xl">Requisiciones de Servicio</CardTitle>
          <CardDescription>
            Historial de todas las requisiciones de servicio generadas.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Exportar a CSV
            </Button>
            <Link href="/requisitions/create">
                <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Nueva Requisición
                </Button>
            </Link>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Dependencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-center">Ítems</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && <TableRow><TableCell colSpan={7} className="text-center text-destructive">{error}</TableCell></TableRow>}
            {!isLoading && requisitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No se han encontrado requisiciones.
                </TableCell>
              </TableRow>
            )}
            {requisitions.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium text-primary">{req.requisitionNumber}</TableCell>
                <TableCell>
                  <ClientFormattedDate date={req.requestDate.toDate()} options={{ day: 'numeric', month: 'long', year: 'numeric' }} />
                </TableCell>
                <TableCell>{req.requesterName}</TableCell>
                <TableCell>{req.department}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn(getStatusBadgeClass(req.status))}>
                      {req.status || 'Pendiente'}
                  </Badge>
                </TableCell>
                 <TableCell className="text-center">
                    <Badge variant="secondary">
                        <Package className="mr-2 h-4 w-4"/>
                        {req.items.length}
                    </Badge>
                </TableCell>
                <TableCell className="text-right">
                    <Link href={`/requisitions/${req.id}/edit`}>
                        <Button variant="outline" size="sm">
                            <Edit className="mr-2 h-3 w-3"/>
                            Editar
                        </Button>
                    </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
