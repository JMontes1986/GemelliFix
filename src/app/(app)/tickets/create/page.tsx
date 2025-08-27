
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
import { db, storage, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, File as FileIcon, X, Sparkles, History } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createLog } from '@/lib/utils';
import type { User, Ticket, Zone, Site, Category } from '@/lib/types';
import { suggestTicketDetails } from '@/ai/flows/suggest-ticket-details';
import { suggestTicketTitle } from '@/ai/flows/suggest-ticket-title';
import type { User as FirebaseUser } from 'firebase/auth';


const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf", "video/mp4", "video/webm", "video/quicktime"];


const ticketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  zoneId: z.string().min(1, 'La zona es requerida.'),
  siteId: z.string().min(1, 'El sitio es requerido.'),
  priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente']),
  category: z.string().min(1, 'La categoría es requerida.'),
  attachments: z.any().optional(),
  // Admin-only historical fields
  historicalCreatedAt: z.string().optional(),
  historicalClosedAt: z.string().optional(),
  closingObservation: z.string().optional(),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

export default function CreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [isTitleLoading, setIsTitleLoading] = React.useState(false);

  const [zones, setZones] = React.useState<Zone[]>([]);
  const [sites, setSites] = React.useState<Site[]>([]);
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [currentUser, setCurrentUser] = React.useState<FirebaseUser | null>(null);

  const isAdmin = currentUser?.email === 'sistemas@colgemelli.edu.co';
  
  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      zoneId: '',
      siteId: '',
      priority: 'Media',
      category: '',
      attachments: [],
      historicalCreatedAt: '',
      historicalClosedAt: '',
      closingObservation: '',
    },
  });
  
  const attachedFiles = form.watch('attachments') || [];
  const selectedZoneId = form.watch('zoneId');
  const ticketTitle = form.watch('title');
  const ticketDescription = form.watch('description');

  React.useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setCurrentUser(user);
        setIsAuthLoading(false);
      } else {
        router.push('/login');
      }
    });

    const qZones = query(collection(db, 'zones'), orderBy('name'));
    const unsubZones = onSnapshot(qZones, snapshot => {
        setZones(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone)));
    });
    
    const qSites = query(collection(db, 'sites'), orderBy('name'));
    const unsubSites = onSnapshot(qSites, snapshot => {
        setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site)));
    });

    const qCategories = query(collection(db, 'categories'), orderBy('name'));
    const unsubCategories = onSnapshot(qCategories, snapshot => {
        setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    });

    return () => {
      unsubscribe();
      unsubZones();
      unsubSites();
      unsubCategories();
    };
  }, [router]);

  const handleGenerateTitle = React.useCallback(async () => {
    const description = form.getValues('description');
    if (!description || description.length < 20) { // Min length to avoid too many calls
        return;
    }
    setIsTitleLoading(true);
    try {
        const result = await suggestTicketTitle({ description });
        form.setValue('title', result.title);
    } catch (error) {
        console.error('Error generating AI title:', error);
        // Do not show toast here to avoid bothering the user on auto-triggers
    } finally {
        setIsTitleLoading(false);
    }
  }, [form]);


  React.useEffect(() => {
    const description = form.watch('description');
    // Debounce logic
    const handler = setTimeout(() => {
        if (description) {
          handleGenerateTitle();
        }
    }, 1000); // 1 second delay

    return () => {
        clearTimeout(handler);
    };
  }, [ticketDescription, handleGenerateTitle, form]);
  
  const handleAiSuggestions = async () => {
    if (!ticketTitle || !ticketDescription) {
        toast({
            variant: 'destructive',
            title: 'Datos insuficientes',
            description: 'Por favor, escribe un título y una descripción antes de usar la IA.',
        });
        return;
    }
    setIsAiLoading(true);
    try {
        const result = await suggestTicketDetails({
            title: ticketTitle,
            description: ticketDescription,
        });
        form.setValue('category', result.category);
        form.setValue('priority', result.priority);
        toast({
            title: 'Sugerencias de la IA aplicadas',
            description: result.reasoning,
        });
    } catch (error) {
        console.error('Error getting AI suggestions:', error);
        toast({
            variant: 'destructive',
            title: 'Error de IA',
            description: 'No se pudieron obtener las sugerencias de la IA.',
        });
    } finally {
        setIsAiLoading(false);
    }
  };


  const onSubmit = async (data: TicketFormValues) => {
    if (!currentUser) {
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Debes iniciar sesión para crear un ticket. Serás redirigido.',
        });
        router.push('/login');
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
      const requesterName = userObject.name;

      const zoneName = zones.find((z) => z.id === data.zoneId)?.name;
      const siteName = sites.find((s) => s.id === data.siteId)?.name;
      
      const attachmentUrls: { url: string, description: string }[] = [];
      const filesToUpload: File[] = data.attachments || [];

      if (filesToUpload.length > 0) {
        toast({ title: 'Subiendo archivos...', description: 'Por favor, espera un momento.' });
        for (const file of filesToUpload) {
          const storageRef = ref(storage, `ticket-attachments/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          attachmentUrls.push({ url: downloadURL, description: file.name });
        }
      }

      const zoneCode = zoneName ? zoneName.substring(0,4).toUpperCase().replace(/\s/g, '') : 'ZONA';
      const siteCode = siteName ? siteName.substring(0,4).toUpperCase().replace(/\s/g, '') : 'SITE';
      const ticketCode = `GEMMAN-${zoneCode}-${siteCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const isHistorical = isAdmin && data.historicalCreatedAt;
      const createdAt = isHistorical ? new Date(data.historicalCreatedAt!) : new Date();
      let dueDate = new Date(createdAt);

      switch(data.priority) {
          case 'Urgente': dueDate.setHours(dueDate.getHours() + 12); break;
          case 'Alta': dueDate.setHours(dueDate.getHours() + 24); break;
          case 'Media': dueDate.setHours(dueDate.getHours() + 36); break;
          case 'Baja': dueDate.setHours(dueDate.getHours() + 48); break;
      }
      
      const status = (isAdmin && data.historicalClosedAt) ? 'Cerrado' : 'Abierto';
      const resolvedAt = (isAdmin && data.historicalClosedAt) ? new Date(data.historicalClosedAt) : undefined;


      const newTicketData: Omit<Ticket, 'id'> = {
        code: ticketCode,
        title: data.title,
        description: data.description,
        zone: zoneName || 'Desconocida',
        site: siteName || 'Desconocido',
        priority: data.priority,
        category: data.category,
        status: status,
        requester: requesterName,
        requesterId: currentUser.uid,
        assignedTo: [],
        assignedToIds: [],
        createdAt: createdAt.toISOString(),
        dueDate: dueDate.toISOString(),
        resolvedAt: resolvedAt?.toISOString(),
        attachments: attachmentUrls,
      };

      const docRef = await addDoc(collection(db, 'tickets'), {
          ...newTicketData,
          createdAt: createdAt, // Use specific date for historical
          dueDate: dueDate,
          resolvedAt: resolvedAt
      });

      const newTicketForLog = { id: docRef.id, ...newTicketData };
      await createLog(userObject, 'create_ticket', { ticket: newTicketForLog });
      
      if (status === 'Cerrado' && data.closingObservation) {
        await createLog(userObject, 'add_comment', { ticket: newTicketForLog, comment: `Observación de Cierre: ${data.closingObservation}` });
      }

      toast({
        title: '¡Ticket Creado!',
        description: 'Tu solicitud de mantenimiento ha sido registrada con éxito.',
      });
      router.push('/tickets');
    } catch (error: any) {
      console.error('Error creando ticket:', error);
      let errorDescription = `Hubo un problema al guardar tu solicitud: ${error.message}`;
      if (error.code === 'storage/unauthorized') {
        errorDescription = "Error de permisos al subir archivos. Asegúrate de que las reglas de Firebase Storage están configuradas correctamente.";
      }
      toast({
        variant: 'destructive',
        title: 'Error al crear el ticket',
        description: errorDescription,
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
          <CardTitle className="font-headline text-2xl">Crear Nueva Solicitud en GemelliFix</CardTitle>
          <CardDescription>
            Completa el formulario para reportar una incidencia. Usa la IA para obtener sugerencias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormDescription>
                      Una vez que termines de escribir, la IA generará un título estandarizado para ti.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de la Solicitud (Generado por IA)</FormLabel>
                     <div className="relative">
                        <FormControl>
                          <Input placeholder="El título aparecerá aquí..." {...field} readOnly className="bg-muted/50" />
                        </FormControl>
                        {isTitleLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                      </div>
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
                            </SelectTrigger>
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
                            </SelectTrigger>
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
              
              <div className="flex justify-end">
                <Button type="button" variant="outline" onClick={handleAiSuggestions} disabled={isAiLoading}>
                    {isAiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Sugerir Categoría y Prioridad
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecciona la categoría del problema" />
                            </SelectTrigger>
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
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona la prioridad de la solicitud" />
                          </SelectTrigger>
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
                                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring">
                                    <span>Sube tus archivos</span>
                                    <input id="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} accept={ACCEPTED_FILE_TYPES.join(",")} />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-muted-foreground">Imágenes, Videos o PDF, hasta 10MB</p>
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

             {isAdmin && (
                <div className="space-y-4 pt-4 border-t-2 border-dashed border-yellow-500">
                    <h3 className="font-headline text-lg flex items-center gap-2 text-primary"><History /> Registro Histórico (Solo Admin)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="historicalCreatedAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Creación</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="historicalClosedAt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Fecha de Cierre</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                     <FormField
                        control={form.control}
                        name="closingObservation"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Observación de Cierre</FormLabel>
                            <FormControl>
                            <Textarea
                                placeholder="Añade una observación sobre la resolución del ticket histórico."
                                {...field}
                            />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
             )}


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
                <Button type="submit" disabled={isLoading || isAuthLoading}>
                   {(isLoading || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   {isAuthLoading ? 'Verificando...' : 'Enviar Solicitud'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
