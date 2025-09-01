
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
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar as CalendarIcon, PlusCircle, Trash2, CheckSquare } from 'lucide-react';
import type { Requisition } from '@/lib/types';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';


const requisitionItemSchema = z.object({
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  product: z.string().min(1, 'El producto es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  authorized: z.boolean().optional(),
  authorizedAt: z.date().optional(),
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

export default function EditRequisitionPage() {
  const router = useRouter();
  const params = useParams();
  const requisitionId = params.id as string;
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isFetching, setIsFetching] = React.useState(true);
  const [requisitionNumber, setRequisitionNumber] = React.useState('');

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
    if (!requisitionId) return;

    const fetchRequisition = async () => {
      try {
        const docRef = doc(db, 'requisitions', requisitionId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as Requisition;
          form.reset({
            requesterName: data.requesterName,
            requesterPosition: data.requesterPosition,
            department: data.department,
            requestDate: data.requestDate.toDate(),
            items: data.items.map(item => ({
                ...item,
                authorizedAt: item.authorizedAt ? item.authorizedAt.toDate() : undefined,
            })),
          });
          setRequisitionNumber(data.requisitionNumber);
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

    fetchRequisition();
  }, [requisitionId, form, router, toast]);

  const onSubmit = async (data: RequisitionFormValues) => {
    setIsLoading(true);
    try {
      const docRef = doc(db, 'requisitions', requisitionId);
      
      const authorizedCount = data.items.filter(item => item.authorized).length;
      let status: Requisition['status'] = 'Pendiente';
      if (authorizedCount === data.items.length) {
          status = 'Aprobada';
      } else if (authorizedCount > 0) {
          status = 'Parcialmente Aprobada';
      }

      await updateDoc(docRef, { ...data, status });
      
      toast({
        title: '¡Requisición Actualizada!',
        description: `Se han guardado los cambios para la requisición ${requisitionNumber}.`,
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

  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Editar Requisición de Servicio</CardTitle>
          <CardDescription>
            Número de Requisición: <span className="font-semibold text-primary">{requisitionNumber}</span>
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
                                                    field.onChange(checked);
                                                    update(index, {
                                                        ...item,
                                                        authorized: !!checked,
                                                        authorizedAt: checked ? new Date() : undefined,
                                                    });
                                                }}
                                            />
                                            {item.authorizedAt && (
                                                <span className="text-xs text-muted-foreground">
                                                    {format(new Date(item.authorizedAt), 'dd/MM/yy')}
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
                      onClick={() => append({ quantity: 1, product: '', description: '', authorized: false })}
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
    </div>
  );
}
