
'use client';

import * as React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter, useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, CheckSquare, History, PackageCheck, UserCheck, Edit, MessageSquare } from 'lucide-react';
import type { Requisition, RequisitionItem, User, Log } from '@/lib/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, createLog } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { onAuthStateChanged } from 'firebase/auth';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';


const requisitionItemSchema = z.object({
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  product: z.string().min(1, 'El producto es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  authorized: z.boolean().optional(),
  authorizedAt: z.date().optional().nullable(),
  received: z.boolean().optional(),
  receivedAt: z.date().optional().nullable(),
});

const requisitionSchema = z.object({
  requesterName: z.string().min(1, 'El nombre del solicitante es requerido.'),
  requesterPosition: z.string().min(1, 'El cargo es requerido.'),
  department: z.string().min(1, 'La dependencia es requerida.'),
  requestDate: z.date({
    required_error: "La fecha de solicitud es requerida.",
  }),
  items: z.array(requisitionItemSchema).min(1, 'Debes añadir al menos un producto a la requisición.'),
});

type RequisitionFormValues = z.infer<typeof requisitionSchema>;

const LogIcon = ({ action }: { action: Log['action'] }) => {
    switch (action) {
        case 'create_requisition': return <CheckSquare className="w-5 h-5 text-green-500" />;
        case 'update_requisition_item': return <Edit className="w-5 h-5 text-yellow-500" />;
        default: return <MessageSquare className="w-5 h-5 text-gray-400" />;
    }
};

const renderLogDescription = (log: Log) => {
    const userName = <strong className="font-semibold">{log.userName}</strong>;
    const { action, details } = log;
    
    switch(action) {
        case 'create_requisition':
            return <>{userName} creó la requisición.</>;
        case 'update_requisition_item':
            return <>{userName} actualizó el producto <strong>{details.productName}</strong>. Campo: '{details.field}', Nuevo Valor: '{details.newValue}'.</>;
        default:
            return <>Acción: {action}</>;
    }
};

export default function EditRequisitionPage() {
  const router = useRouter();
  const params = useParams();
  const requisitionId = params.id as string;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [requisition, setRequisition] = React.useState<Requisition | null>(null);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);
  const [logs, setLogs] = React.useState<Log[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);

  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      requesterName: '',
      requesterPosition: '',
      department: '',
      items: [],
    },
  });
  
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items"
  });

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if(user) {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if(userDoc.exists()) {
                setCurrentUser({id: user.uid, ...userDoc.data()} as User);
            }
        }
    });
    return () => unsubscribeAuth();
  }, []);

  React.useEffect(() => {
    if (!requisitionId) return;

    const fetchRequisition = async () => {
      try {
        const docRef = doc(db, 'requisitions', requisitionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Requisition;
          setRequisition({id: docSnap.id, ...data});
          form.reset({
            requesterName: data.requesterName,
            requesterPosition: data.requesterPosition,
            department: data.department,
            requestDate: data.requestDate.toDate(),
            items: data.items.map(item => ({
                ...item,
                authorized: item.authorized || false,
                received: item.received || false,
                authorizedAt: item.authorizedAt ? item.authorizedAt.toDate() : null,
                receivedAt: item.receivedAt ? item.receivedAt.toDate() : null,
            })),
          });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'No se encontró la requisición.' });
          router.push('/requisitions');
        }
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar la requisición.' });
      } finally {
        setIsFetching(false);
      }
    };

    const logsQuery = query(collection(db, 'logs'), where("details.requisitionId", "==", requisitionId), orderBy('timestamp', 'desc'));
    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
        const fetchedLogs = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as Log));
        setLogs(fetchedLogs);
        setIsLoadingLogs(false);
    }, (error) => {
        console.error("Error fetching logs:", error);
        setIsLoadingLogs(false);
    });

    fetchRequisition();

    return () => {
        unsubscribeLogs();
    };

  }, [requisitionId, form, router, toast]);

  const onSubmit = async (data: RequisitionFormValues) => {
    if (!requisition || !currentUser) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, 'requisitions', requisitionId);
      
      const originalItems = requisition.items || [];
      const updatedItems = data.items;

      // --- Log generation logic ---
      const logPromises: Promise<void>[] = [];

      updatedItems.forEach((newItem, index) => {
          const oldItem = originalItems[index];

          if (!oldItem) { // Item was added
              logPromises.push(createLog(currentUser, 'update_requisition_item', { requisitionId, field: 'Nuevo Producto', newValue: newItem.product, productName: newItem.product }));
              return;
          }

          // Check for changes in existing items
          const changedFields: (keyof RequisitionItem)[] = ['quantity', 'product', 'description', 'authorized', 'received'];
          changedFields.forEach(field => {
              let oldValue = oldItem[field];
              let newValue = newItem[field];
              
              if (field === 'authorized' || field === 'received') {
                oldValue = oldValue ? 'Sí' : 'No';
                newValue = newValue ? 'Sí' : 'No';
              }
              
              if (String(newValue) !== String(oldValue)) {
                  logPromises.push(createLog(currentUser, 'update_requisition_item', { 
                      requisitionId, 
                      field: field, 
                      oldValue: oldValue, 
                      newValue: newValue,
                      productName: newItem.product
                  }));
              }
          });
      });
      if (originalItems.length > updatedItems.length) {
          const removedItems = originalItems.slice(updatedItems.length);
          removedItems.forEach(item => {
              logPromises.push(createLog(currentUser, 'update_requisition_item', { requisitionId, field: 'Producto Eliminado', oldValue: item.product, productName: item.product }));
          });
      }
      
      await Promise.all(logPromises);
      // --- End of log generation ---

      const authorizedCount = data.items.filter(item => item.authorized).length;
      const receivedCount = data.items.filter(item => item.received).length;
      const authorizedItemsCount = data.items.filter(item => item.authorized).length;

      let status: Requisition['status'] = 'Pendiente';
      
      if (authorizedCount === 0 && receivedCount === 0) {
        status = 'Pendiente';
      } else if (authorizedCount > 0 && receivedCount === authorizedItemsCount && authorizedItemsCount > 0) {
        status = 'Completada';
      } else if (authorizedCount === data.items.length) {
        status = 'Aprobada';
      } else if (authorizedCount > 0) {
        status = 'Parcialmente Aprobada';
      }
      
      const sanitizedData = {
          ...data,
          items: data.items.map(item => ({
              ...item,
              authorizedAt: item.authorized ? (item.authorizedAt || new Date()) : null,
              receivedAt: item.received ? (item.receivedAt || new Date()) : null,
          })),
          status,
      };

      await updateDoc(docRef, sanitizedData);
      
      toast({
        title: '¡Requisición Actualizada!',
        description: `Se han guardado los cambios para la requisición ${requisition.requisitionNumber}.`,
      });
      router.push('/requisitions');
    } catch (error: any) {
      console.error('Error actualizando requisición:', error);
      toast({
        variant: 'destructive',
        title: 'Error al actualizar',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
        <div className="flex justify-center items-start py-8">
            <Card className="w-full max-w-4xl">
                 <CardHeader>
                    <Skeleton className="h-8 w-1/2" />
                    <Skeleton className="h-4 w-3/4" />
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                     <Skeleton className="h-10 w-60" />
                     <Skeleton className="h-40 w-full" />
                </CardContent>
                <CardFooter>
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    );
  }
  
  if(!requisition) return null;

  return (
    <div className="space-y-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Editar Requisición de Servicio</CardTitle>
          <CardDescription>
            Número de Requisición: <span className="font-semibold text-primary">{requisition.requisitionNumber}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <FormField
                    control={form.control}
                    name="requesterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre Solicitante</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Julián Andrés Montes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="requesterPosition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cargo</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Coordinador Servicios Generales" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dependencia</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Mantenimiento" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>

               <FormField
                    control={form.control}
                    name="requestDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Solicitud</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[240px] pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                {field.value ? (
                                    format(field.value, "PPP", { locale: es })
                                ) : (
                                    <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />

                <div>
                    <FormLabel>Productos o Servicios</FormLabel>
                    <div className="mt-2 border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Cant.</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="w-[120px] text-center">Autorizado</TableHead>
                            <TableHead className="w-[120px] text-center">Recibido</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {fields.map((item, index) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.quantity`}
                                  render={({ field }) => <Input type="number" {...field} />}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.product`}
                                  render={({ field }) => <Input {...field} />}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`items.${index}.description`}
                                  render={({ field }) => <Input {...field} />}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.authorized`}
                                    render={({ field }) => (
                                        <div className="flex flex-col items-center gap-1">
                                            <Checkbox
                                                checked={field.value}
                                                onCheckedChange={(checked) => {
                                                    const isChecked = !!checked;
                                                    const currentItem = form.getValues(`items.${index}`);
                                                    update(index, {
                                                        ...currentItem,
                                                        authorized: isChecked,
                                                        authorizedAt: isChecked ? new Date() : null,
                                                    });
                                                }}
                                            />
                                            {form.watch(`items.${index}.authorizedAt`) && (
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(form.watch(`items.${index}.authorizedAt`)), 'dd/MM/yy')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    />
                              </TableCell>
                               <TableCell className="text-center">
                                 <FormField
                                    control={form.control}
                                    name={`items.${index}.received`}
                                    render={({ field }) => (
                                        <div className="flex flex-col items-center gap-1">
                                            <Checkbox
                                                checked={field.value}
                                                disabled={!form.watch(`items.${index}.authorized`)}
                                                onCheckedChange={(checked) => {
                                                    const isChecked = !!checked;
                                                    const currentItem = form.getValues(`items.${index}`);
                                                    update(index, {
                                                        ...currentItem,
                                                        received: isChecked,
                                                        receivedAt: isChecked ? new Date() : null,
                                                    });
                                                }}
                                            />
                                            {form.watch(`items.${index}.receivedAt`) && (
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(form.watch(`items.${index}.receivedAt`)), 'dd/MM/yy')}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    />
                              </TableCell>
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ quantity: 1, product: '', description: '', authorized: false, authorizedAt: null, received: false, receivedAt: null })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Producto
                    </Button>
                     <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                </div>
              
             <CardFooter className="flex justify-end pt-4 px-0">
                <Button type="submit" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Guardar Cambios
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="font-headline text-lg flex items-center gap-2">
                <History className="w-5 h-5" />
                Historial de Cambios
            </CardTitle>
        </CardHeader>
        <CardContent>
            <div className="space-y-4 text-sm">
                {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : logs.length > 0 ? (
                    logs.map((log) => (
                        <div key={log.id} className="flex gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                            <div className="flex-shrink-0">
                                <LogIcon action={log.action} />
                            </div>
                            <div className="flex-1">
                                <p>{renderLogDescription(log)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    <ClientFormattedDate date={log.timestamp?.toDate()} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <p className="text-muted-foreground text-center py-4">No hay historial para esta requisición.</p>
                )}
            </div>
        </CardContent>
    </Card>

    </div>
  );
}
