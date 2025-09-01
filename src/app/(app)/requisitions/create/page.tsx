
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Loader2, UploadCloud, File as FileIcon, X, Calendar as CalendarIcon } from 'lucide-react';
import type { User, Attachment } from '@/lib/types';
import type { User as FirebaseUser } from 'firebase/auth';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];

const requisitionSchema = z.object({
  requesterName: z.string().min(1, 'El nombre del solicitante es requerido.'),
  requestDate: z.date({
    required_error: "La fecha de solicitud es requerida.",
  }),
  costCenter: z.string().min(1, 'El centro de costos es requerido.'),
  description: z.string().min(1, 'La descripción del servicio es requerida.'),
  attachments: z.any().optional(),
});

type RequisitionFormValues = z.infer<typeof requisitionSchema>;

export default function CreateRequisitionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(null);

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'Administrador') {
            setCurrentUser(user);
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
      costCenter: '',
      description: '',
      attachments: [],
    },
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
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        throw new Error("User data not found in Firestore.");
      }
      
      const userObject = userDocSnap.data() as User;

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
        requesterId: userObject.id,
        requestDate: data.requestDate,
        costCenter: data.costCenter,
        description: data.description,
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
      };


      await addDoc(collection(db, 'requisitions'), newRequisitionData);

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="requesterName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Solicitante</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre de quien solicita" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                                    "pl-3 text-left font-normal",
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
              </div>

               <FormField
                control={form.control}
                name="costCenter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Centro de Costos</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Mantenimiento General, Sistemas, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción del Servicio o Insumo Requerido</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Detallar el servicio, compra o trabajo a realizar."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || isAuthLoading}>
                   {(isLoading || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isAuthLoading ? 'Verificando...' : 'Guardar Requisición'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
