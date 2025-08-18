
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zones, sites, users, categories } from '@/lib/data';
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, File as FileIcon, X } from 'lucide-react';
import type { Attachment } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];


const ticketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  zoneId: z.string().min(1, 'La zona es requerida.'),
  siteId: z.string().min(1, 'El sitio es requerido.'),
  priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente'], {
    required_error: 'La prioridad es requerida.',
  }),
  category: z.string().min(1, 'La categoría es requerida.'),
  attachments: z.any().optional(),
});


type TicketFormValues = z.infer<typeof ticketSchema>

export default function CreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthReady, setIsAuthReady] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      zoneId: '',
      siteId: '',
      priority: 'Media',
      category: 'General',
    },
  });

  const selectedZoneId = form.watch('zoneId');
  const fileRef = React.useRef<HTMLInputElement>(null);
  
   React.useEffect(() => {
    form.setValue('attachments', attachedFiles);
  }, [attachedFiles, form]);


  const onSubmit = async (data: TicketFormValues) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Debes iniciar sesión para crear un ticket.',
        });
        return;
    }
    setIsLoading(true);
    try {
      // Get user name from 'users' collection
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      const requesterName = userDocSnap.exists() ? userDocSnap.data().name : currentUser.email || 'Usuario Desconocido';


      const zoneName = zones.find((z) => z.id === data.zoneId)?.name;
      const siteName = sites.find((s) => s.id === data.siteId)?.name;

      // 1. Upload files to Firebase Storage
      const attachmentUrls: Attachment[] = [];
      if (attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          const storageRef = ref(storage, `ticket-attachments/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          attachmentUrls.push({ url: downloadURL, description: file.name });
        }
      }

      // 2. Create ticket in Firestore
      const zoneCode = zoneName?.substring(0,4).toUpperCase() || '????';
      const siteCode = siteName?.substring(0,4).toUpperCase() || '????';
      const ticketCode = `GEMMAN-${zoneCode}-${siteCode}-${Math.floor(1000 + Math.random() * 9000)}`;

      await addDoc(collection(db, 'tickets'), {
        code: ticketCode,
        title: data.title,
        description: data.description,
        zone: zoneName,
        site: siteName,
        priority: data.priority,
        category: data.category,
        status: 'Abierto',
        requester: requesterName,
        assignedTo: '',
        createdAt: serverTimestamp(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // Placeholder: vence en 7 días
        attachments: attachmentUrls,
      });

      toast({
        title: '¡Ticket Creado!',
        description: 'Tu solicitud de mantenimiento ha sido registrada con éxito.',
      });
      router.push('/tickets');
    } catch (error) {
      console.error('Error creando ticket:', error);
      toast({
        variant: 'destructive',
        title: 'Error al crear el ticket',
        description: 'Hubo un problema al guardar tu solicitud. Revisa los permisos de Firestore.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      
      for(const file of newFiles) {
        if (file.size > MAX_FILE_SIZE) {
              toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: `El archivo ${file.name} supera los 5MB.`});
              continue;
          }
        if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
               toast({ variant: 'destructive', title: 'Tipo de archivo no permitido', description: `El archivo ${file.name} no es una imagen o PDF.`});
              continue;
        }
        validFiles.push(file);
      }
      
      setAttachedFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setAttachedFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Nueva Solicitud en GemelliFix</CardTitle>
          <CardDescription>
            Completa el formulario para reportar una incidencia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de la Solicitud</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Fuga de agua en baño del segundo piso" {...field} />
                    </FormControl>
                    <FormDescription>
                      Sé breve y descriptivo.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                    control={form.control}
                    name="zoneId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Zona</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona la zona afectada" />
                            </Trigger>
                        </FormControl>
                        <SelectContent>
                            {zones.map((zone) => (
                            <SelectItem key={zone.id} value={zone.id}>
                                {zone.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="siteId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Sitio Específico</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedZoneId}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona el sitio específico" />
                            </Trigger>
                        </FormControl>
                        <SelectContent>
                            {sites
                            .filter((site) => site.zoneId === selectedZoneId)
                            .map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                {site.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>

               <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción Detallada</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe el problema con el mayor detalle posible. Incluye qué has observado, cuándo comenzó, y cualquier otra información relevante."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona la categoría del problema" />
                            </Trigger>
                        </FormControl>
                        <SelectContent>
                            {categories.map((category) => (
                                <SelectItem key={category.id} value={category.name}>
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridad</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la prioridad de la solicitud" />
                          </Trigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Baja">Baja</SelectItem>
                          <SelectItem value="Media">Media</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="attachments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjuntar Evidencia (Opcional)</FormLabel>
                    <FormControl>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                            <div className="flex text-sm text-muted-foreground">
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring">
                                    <span>Sube tus archivos</span>
                                    <input id="file-upload" type="file" className="sr-only" ref={fileRef} multiple onChange={handleFileChange} accept={ACCEPTED_FILE_TYPES.join(",")} />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Imágenes o PDF hasta 5MB</p>
                        </div>
                      </div>
                    </FormControl>
                     {attachedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Archivos adjuntos:</p>
                        <ul className="space-y-2">
                          {attachedFiles.map((file, index) => (
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

              <Alert variant="default">
                <span className="text-2xl absolute -top-1.5 left-2">📌</span>
                <AlertTitle className="font-headline text-primary pl-6">SLA – Tiempos de atención de solicitudes</AlertTitle>
                <AlertDescription>
                   <div className="pl-6 space-y-3 pt-2">
                     <p>En la aplicación GemelliFix, toda solicitud de mantenimiento cuenta con una prioridad asignada, que determina los tiempos de atención (SLA).</p>
                     <div>
                       <h4 className="font-semibold mb-2">⏱️ Tiempos según prioridad</h4>
                       <ul className="space-y-2 list-inside">
                           <li>
                               <p>🔴 <strong className="font-semibold">Urgente (12 horas):</strong> situaciones críticas que afectan la seguridad, el funcionamiento del colegio o impiden el desarrollo normal de las actividades académicas.</p>
                           </li>
                           <li>
                               <p>🟠 <strong className="font-semibold">Alta (24 horas):</strong> problemas importantes que pueden escalar si no se atienden pronto (ej: daños eléctricos, filtraciones, equipos esenciales).</p>
                           </li>
                           <li>
                               <p>🟡 <strong className="font-semibold">Media (36 horas):</strong> mantenimientos necesarios pero no bloqueantes (ej: mobiliario, pintura, luminarias no esenciales).</p>
                           </li>
                           <li>
                               <p>🟢 <strong className="font-semibold">Baja (48 horas):</strong> ajustes menores, mejoras estéticas o preventivos programados.</p>
                           </li>
                       </ul>
                     </div>
                     <div className="pt-2">
                       <h4 className="font-semibold mb-2">⚠️ Nota importante para los usuarios</h4>
                         <p>La prioridad inicial puede ser sugerida al registrar la solicitud, pero solo el Líder de Mantenimiento (Administrador) tiene la facultad de confirmarla o cambiarla según el impacto real en la operación del colegio.</p>
                         <p className="mt-1">Esto significa que un caso marcado como “Bajo” puede ser elevado a “Urgente” si representa un riesgo, o uno marcado como “Urgente” puede reclasificarse como “Media” si no afecta procesos esenciales.</p>
                     </div>
                   </div>
                 </AlertDescription>
              </Alert>

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading || !isAuthReady}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {!isAuthReady && !isLoading ? 'Verificando...' : 'Enviar Solicitud'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

    