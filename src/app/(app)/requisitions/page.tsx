
'use client';

import * as React from 'react';
import { collection, onSnapshot, query, orderBy, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Package } from 'lucide-react';
import type { Requisition } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function RequisitionsListPage() {
  const router = useRouter();
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
        <Link href="/requisitions/create">
            <Button>
                <FileText className="mr-2 h-4 w-4" />
                Nueva Requisición
            </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Dependencia</TableHead>
              <TableHead className="text-center">Ítems</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {error && <TableRow><TableCell colSpan={5} className="text-center text-destructive">{error}</TableCell></TableRow>}
            {!isLoading && requisitions.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
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
                 <TableCell className="text-center">
                    <Badge variant="secondary">
                        <Package className="mr-2 h-4 w-4"/>
                        {req.items.length}
                    </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
