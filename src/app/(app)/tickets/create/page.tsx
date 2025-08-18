
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
import { zones, sites, users } from '@/lib/data';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { Loader2, UploadCloud, File as FileIcon, X } from 'lucide-react';
import type { Attachment } from '@/lib/types';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];


const ticketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  zoneId: z.string().min(1, 'La zona es requerida.'),
  siteId: z.string().min(1, 'El sitio es requerido.'),
  priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente']),
  attachments: z.custom<FileList>().optional()
    .refine((files) => !files || Array.from(files).every((file) => file.size <= MAX_FILE_SIZE), `Cada archivo debe ser de máximo 5MB.`)
    .refine((files) => !files || Array.from(files).every((file) => ACCEPTED_IMAGE_TYPES.includes(file.type)), "Solo se aceptan archivos .jpg, .jpeg, .png y .webp."),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

// Asumimos que el usuario actual es el primer usuario de la lista
const currentUser = users[0];

export default function CreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [attachedFiles, setAttachedFiles] = React.useState<File[]>([]);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      title: '',
      description: '',
      zoneId: '',
      siteId: '',
      priority: 'Media',
    },
  });

  const selectedZoneId = form.watch('zoneId');
  const fileRef = form.register('attachments');


  const onSubmit = async (data: TicketFormValues) => {
    setIsLoading(true);
    try {
      const zone = zones.find((z) => z.id === data.zoneId);
      const site = sites.find((s) => s.id === data.siteId);

      // 1. Upload files to Firebase Storage
      const attachmentUrls: Attachment[] = [];
      if (data.attachments && data.attachments.length > 0) {
        for (const file of Array.from(data.attachments)) {
          const storageRef = ref(storage, `ticket-attachments/${Date.now()}-${file.name}`);
          const snapshot = await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(snapshot.ref);
          attachmentUrls.push({ url: downloadURL, description: file.name });
        }
      }

      // 2. Create ticket in Firestore
      const ticketCode = `GEMMAN-${zone?.name.substring(0,4).toUpperCase()}-${site?.name.substring(0,4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      await addDoc(collection(db, 'tickets'), {
        code: ticketCode,
        title: data.title,
        description: data.description,
        zone: zone?.name,
        site: site?.name,
        priority: data.priority,
        status: 'Abierto',
        requester: currentUser.name,
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
        description: 'Hubo un problema al guardar tu solicitud. Por favor, inténtalo de nuevo.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachedFiles(Array.from(e.target.files));
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...attachedFiles];
    newFiles.splice(index, 1);
    setAttachedFiles(newFiles);
    
    // Create a new FileList and update the form value
    const dataTransfer = new DataTransfer();
    newFiles.forEach(file => dataTransfer.items.add(file));
    form.setValue('attachments', dataTransfer.files);
  };

  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Crear Nueva Solicitud de Mantenimiento</CardTitle>
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
                                    <input id="file-upload" type="file" className="sr-only" {...fileRef} multiple onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">o arrastra y suelta</p>
                            </div>
                            <p className="text-xs text-muted-foreground">PNG, JPG, JPEG hasta 5MB</p>
                        </div>
                      </div>
                    </FormControl>
                     {attachedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-sm font-medium">Archivos adjuntos:</p>
                        <ul className="space-y-2">
                          {attachedFiles.map((file, index) => (
                            <li key={index} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="flex items-center gap-2">
                                <FileIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{file.name}</span>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeFile(index)}>
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
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Baja">Baja</SelectItem>
                          <SelectItem value="Media">Media</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                       <FormDescription>
                        Selecciona Urgente solo para problemas que impiden la operación o representan un riesgo.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              <div className="flex justify-end pt-4">
                <Button type="submit" disabled={isLoading}>
                   {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar Solicitud
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
