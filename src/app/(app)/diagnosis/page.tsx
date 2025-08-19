
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
import { Loader2, Zap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';


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
  const [currentUser, setCurrentUser] = React.useState<FirebaseAuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = React.useState(true);
  
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleSimpleConnectionTest = async () => {
    if (!currentUser) {
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: 'Debes iniciar sesión para realizar la prueba.',
      });
      return;
    }
    setIsLoading(true);
    setExecutionResult({ status: 'Enviando...', message: 'Intentando escribir en `diagnosis_logs`...' });
    try {
      const docRef = await addDoc(collection(db, 'diagnosis_logs'), {
        test: 'simple_connection_test',
        user: currentUser.email,
        createdAt: serverTimestamp(),
      });
      const successMsg = `¡Éxito! Se ha escrito un documento en Firestore con el ID: ${docRef.id}. La conexión es correcta.`;
      toast({
        title: 'Conexión Exitosa',
        description: 'Se ha verificado la escritura en Firestore.',
      });
      setExecutionResult({ status: 'Éxito', message: successMsg });
    } catch (error: any) {
      console.error('Error en la prueba de conexión:', error);
      const errorMsg = `No se pudo escribir en Firestore. Detalles: ${error.message}`;
      toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: errorMsg,
      });
       setExecutionResult({ status: 'Error', message: errorMsg });
    } finally {
        setIsLoading(false);
    }
  };


  const form = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  const onSubmit = async (data: DiagnosisFormValues) => {
    if (isAuthLoading) {
       toast({
            variant: 'destructive',
            title: 'Un momento...',
            description: 'Verificando estado de autenticación.',
        });
        return;
    }

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
      
      const successMsg = `El registro de diagnóstico ha sido guardado en Firestore con el ID: ${docRef.id}. La colección 'diagnosis_logs' fue creada o actualizada en la base de datos 'gemellifix'.`;
      toast({
        title: 'Diagnóstico Enviado',
        description: 'La conexión con Firestore y la base de datos \'gemellifix\' es exitosa.',
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
    <div className="flex flex-col items-center justify-start py-8 gap-8">
      
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Prueba de Conexión Rápida</CardTitle>
          <CardDescription>
            Usa este botón para realizar una prueba de escritura simple y directa a Firestore. Esto ayuda a verificar rápidamente si las reglas de seguridad y la configuración del proyecto son correctas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSimpleConnectionTest} disabled={isLoading || isAuthLoading} className="w-full">
            {(isLoading || isAuthLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Probar Conexión de Escritura
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Diagnóstico de Conexión a Firestore</CardTitle>
          <CardDescription>
            Esta tarjeta permite verificar la conexión con la base de datos 'gemellifix' en Firestore. Al enviar este formulario, se intentará crear una colección de prueba para confirmar que todo funciona correctamente.
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
              <Button type="submit" disabled={isLoading || isAuthLoading}>
                 {(isLoading || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isAuthLoading ? 'Verificando Auth...' : 'Crear Colección de Prueba'}
              </Button>
               <Alert variant={executionResult.status === 'Error' ? 'destructive' : (executionResult.status === 'Éxito' ? 'default' : 'default')}
                 className={executionResult.status === 'Éxito' ? 'border-green-500' : ''}
               >
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
