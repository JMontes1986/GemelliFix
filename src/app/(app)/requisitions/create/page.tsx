
'use client';

import * as React from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, File as FileIcon, X, Calendar as CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import type { User, Attachment, Requisition } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createLog } from '@/lib/utils';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const requisitionItemSchema = z.object({
  quantity: z.coerce.number().min(1, 'La cantidad debe ser al menos 1.'),
  product: z.string().min(1, 'El producto es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
});

const requisitionSchema = z.object({
  requesterName: z.string().min(1, 'El nombre del solicitante es requerido.'),
  requesterPosition: z.string().min(1, 'El cargo es requerido.'),
  department: z.string().min(1, 'La dependencia es requerida.'),
  requestDate: z.date({
    required_error: "La fecha de solicitud es requerida.",
  }),
  items: z.array(requisitionItemSchema).min(1, 'Debes añadir al menos un producto a la requisición.'),
  attachments: z.any().optional(),
});

type RequisitionFormValues = z.infer<typeof requisitionSchema>;

export default function CreateRequisitionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'Administrador') {
            setCurrentUser({ id: user.uid, ...userDocSnap.data()} as User);
        } else {
            toast({ variant: 'destructive', title: 'Acceso Denegado', description: 'No tienes permisos para acceder a esta página.' });
            router.push('/dashboard');
        }
        setIsAuthLoading(false);
      } else {
        router.push('/login');
      }
    });
     return () => unsubscribe();
  }, [router, toast]);
  
  const form = useForm<RequisitionFormValues>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      requesterName: '',
      requesterPosition: '',
      department: '',
      items: [{ quantity: 1, product: '', description: '' }],
      attachments: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items"
  });

  const attachedFiles = form.watch('attachments') || [];

  const onSubmit = async (data: RequisitionFormValues) => {
    if (!currentUser) {
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Debes iniciar sesión para crear una requisición.',
        });
        return;
    }
    setIsLoading(true);
    try {
      
      const attachmentUrls: Attachment[] = [];
      const filesToUpload: File[] = data.attachments || [];

      if (filesToUpload.length > 0) {
        toast({ title: 'Subiendo archivos...', description: 'Por favor, espera un momento.' });
        for (const file of filesToUpload) {
          const storageRef = ref(storage, `requisition-attachments/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          attachmentUrls.push({ url: downloadURL, description: file.name });
        }
      }
      
      // Generate consecutive number
      const requisitionsRef = collection(db, 'requisitions');
      const q = query(requisitionsRef, orderBy('createdAt', 'desc'), limit(1));
      const lastRequisitionSnap = await getDocs(q);
      let newReqNumber = 1;
      if (!lastRequisitionSnap.empty) {
        const lastReqData = lastRequisitionSnap.docs[0].data();
        const lastNumberMatch = lastReqData.requisitionNumber.match(/\d+$/);
        if (lastNumberMatch) {
            newReqNumber = parseInt(lastNumberMatch[0], 10) + 1;
        }
      }
      const year = new Date().getFullYear();
      const requisitionNumber = `REQ-${year}-${String(newReqNumber).padStart(4, '0')}`;

      const newRequisitionData = {
        requisitionNumber,
        requesterName: data.requesterName,
        requesterPosition: data.requesterPosition,
        department: data.department,
        requesterId: currentUser.id,
        requestDate: data.requestDate,
        items: data.items.map(item => ({ ...item, authorized: false, authorizedAt: null, received: false, receivedAt: null })),
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
        status: 'Pendiente',
      };

      const docRef = await addDoc(collection(db, 'requisitions'), newRequisitionData);

      await createLog(currentUser, 'create_requisition', { 
        requisition: { id: docRef.id, ...newRequisitionData } as Requisition
      });

      toast({
        title: '¡Requisición Creada!',
        description: `Se ha registrado con el número ${requisitionNumber}.`,
      });
      router.push('/requisitions');
    } catch (error: any) {
      console.error('Error creando requisición:', error);
      toast({
        variant: 'destructive',
        title: 'Error al crear la requisición',
        description: error.message,
      });
    } finally {
        setIsLoading(false);
    }
  };

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
     if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const currentFiles = form.getValues('attachments') || [];
      const validFiles: File[] = [];
      
      for(const file of newFiles) {
        if (file.size > MAX_FILE_SIZE) {
              toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: `El archivo ${file.name} supera los 10MB.`});
              continue;
          }
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
               toast({ variant: 'destructive', title: 'Tipo de archivo no permitido', description: `El archivo ${file.name} no es una imagen o PDF.`});
              continue;
        }
        validFiles.push(file);
      }
      form.setValue('attachments', [...currentFiles, ...validFiles], { shouldValidate: true });
    }
  }

  function removeFile(indexToRemove: number) {
    const currentFiles = form.getValues('attachments') || [];
    const newFiles = currentFiles.filter((_:any, index: number) => index !== indexToRemove);
    form.setValue('attachments', newFiles, { shouldValidate: true });
  }

  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Requisición de Servicio</CardTitle>
          <CardDescription>
            Este formulario es para uso exclusivo del administrador para generar solicitudes formales de servicio.
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
                      onClick={() => append({ quantity: 1, product: '', description: '' })}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Producto
                    </Button>
                     <FormMessage>{form.formState.errors.items?.root?.message}</FormMessage>
                </div>
              
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjuntar Cotizaciones o Documentos (Opcional)</FormLabel>
                    <FormControl>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="flex text-sm text-muted-foreground">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
                                    <span>Sube tus archivos</span>
                                    <input id="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept={ACCEPTED_FILE_TYPES.join(",")} />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Imágenes o PDF, hasta 10MB</p>
                        </div>
                      </div>
                    </FormControl>
                     {attachedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Archivos adjuntos:</p>
                        <ul className="space-y-2">
                          {attachedFiles.map((file: File, index: number) => (
                            <li key={index} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                              <div className="flex items-center gap-2 truncate">
                                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate" title={file.name}>{file.name}</span>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)} className="flex-shrink-0">
                                <X className="h-4 w-4" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

             <CardFooter className="flex justify-end pt-4 px-0">
                <Button type="submit" disabled={isLoading || isAuthLoading}>
                   {(isLoading || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isAuthLoading ? 'Verificando...' : 'Guardar Requisición'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
