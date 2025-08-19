
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Esquema de validación simple para el formulario de diagnóstico
const diagnosisSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
});

type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;

export default function DiagnosisPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [executionResult, setExecutionResult] = React.useState<{status: string, message: string}>({ status: 'Pendiente', message: 'Aún no se ha intentado enviar el formulario.' });
  
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
        const errorMsg = 'Error de Autenticación: Debes iniciar sesión para enviar un diagnóstico.';
        toast({
            variant: 'destructive',
            title: 'Error de Autenticación',
            description: 'Debes iniciar sesión para enviar un diagnóstico.',
        });
        setExecutionResult({ status: 'Error', message: errorMsg });
        return;
    }
    setIsLoading(true);
    setExecutionResult({ status: 'Enviando...', message: 'Intentando conectar con Firestore...' });
    try {
      // Intenta guardar en una colección simple para probar la conexión
      const docRef = await addDoc(collection(db, 'diagnosis_logs'), {
        title: data.title,
        description: data.description,
        user: currentUser.email,
        createdAt: serverTimestamp(),
      });
      
      const successMsg = `El registro de diagnóstico ha sido guardado en Firestore con el ID: ${docRef.id}`;
      toast({
        title: 'Diagnóstico Enviado',
        description: successMsg,
      });
      setExecutionResult({ status: 'Éxito', message: successMsg });
      form.reset(); // Limpia el formulario después de enviar
    } catch (error: any) {
      console.error('Error guardando el diagnóstico:', error);
      const errorMsg = `No se pudo guardar el registro en Firestore. Detalles: ${error.message}`;
      toast({
        variant: 'destructive',
        title: 'Error al Guardar',
        description: errorMsg,
      });
       setExecutionResult({ status: 'Error', message: errorMsg });
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
            <CardFooter className="flex-col items-start gap-4">
              <Button type="submit" disabled={isLoading}>
                 {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Guardar en Firestore
              </Button>
               <Alert variant={executionResult.status === 'Error' ? 'destructive' : 'default'}>
                    <AlertTitle className="font-headline">Resultado de Ejecución: {executionResult.status}</AlertTitle>
                    <AlertDescription className="font-mono text-xs">
                        {executionResult.message}
                    </AlertDescription>
                </Alert>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
