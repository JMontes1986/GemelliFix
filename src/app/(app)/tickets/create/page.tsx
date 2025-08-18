
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
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ticketSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
  zoneId: z.string().min(1, 'La zona es requerida.'),
  siteId: z.string().min(1, 'El sitio es requerido.'),
  priority: z.enum(['Baja', 'Media', 'Alta', 'Urgente']),
});

type TicketFormValues = z.infer<typeof ticketSchema>;

// Asumimos que el usuario actual es el primer usuario de la lista
const currentUser = users[0];

export default function CreateTicketPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

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

  const onSubmit = async (data: TicketFormValues) => {
    setIsLoading(true);
    try {
      const zone = zones.find((z) => z.id === data.zoneId);
      const site = sites.find((s) => s.id === data.siteId);

      // Generar un código de ticket simple
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
