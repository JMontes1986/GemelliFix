
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import { Textarea } from '@/components/ui/textarea';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

// Esquema de validación simple para el formulario de diagnóstico
const diagnosisSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
});

type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;

export default function DiagnosisPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const form = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (data: DiagnosisFormValues) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Debes iniciar sesión para enviar un diagnóstico.',
        });
        return;
    }
    setIsLoading(true);
    try {
      // Intenta guardar en una colección simple para probar la conexión
      await addDoc(collection(db, 'diagnosis_logs'), {
        title: data.title,
        description: data.description,
        user: currentUser.email,
        createdAt: serverTimestamp(),
      });

      toast({
        title: 'Diagnóstico Enviado',
        description: 'Tu registro de diagnóstico ha sido guardado en Firestore.',
      });
      form.reset(); // Limpia el formulario después de enviar
    } catch (error) {
      console.error('Error guardando el diagnóstico:', error);
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: 'No se pudo guardar el registro en Firestore. Revisa la consola y los permisos de la base de datos.',
      });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Página de Diagnóstico de Firestore</CardTitle>
          <CardDescription>
            Usa este formulario para verificar que la escritura en la base de datos funciona correctamente.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título de Prueba</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Prueba de conexión Firestore" {...field} />
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
                    <FormLabel>Descripción de Prueba</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe la prueba que se está realizando."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Guardar en Firestore
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
