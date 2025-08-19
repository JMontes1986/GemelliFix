
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
import { Loader2, Zap, BrainCircuit } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { diagnoseFirebaseConnection, type FirebaseDiagnosisOutput } from '@/ai/flows/diagnose-firebase-connection';
import { Skeleton } from '@/components/ui/skeleton';


// Esquema de validación simple para el formulario de diagnóstico
const diagnosisSchema = z.object({
  title: z.string().min(1, 'El título es requerido.'),
  description: z.string().min(1, 'La descripción es requerida.'),
});

type DiagnosisFormValues = z.infer<typeof diagnosisSchema>;

export default function DiagnosisPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isAiLoading, setIsAiLoading] = React.useState(false);
  const [executionResult, setExecutionResult] = React.useState<{status: string, message: string}>({ status: 'Pendiente', message: 'Aún no se ha intentado ninguna operación.' });
  const [aiDiagnosis, setAiDiagnosis] = React.useState<FirebaseDiagnosisOutput | null>(null);
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
    setAiDiagnosis(null);

    if (isAuthLoading) {
      const authWaitMsg = 'Esperando la confirmación de autenticación de Firebase... Por favor, inténtalo de nuevo en un segundo.';
      setExecutionResult({ status: 'Verificando Auth...', message: authWaitMsg });
      toast({
        variant: 'default',
        title: 'Un momento...',
        description: authWaitMsg,
      });
      return;
    }
    
    if (!currentUser) {
      const authErrorMsg = 'Debes iniciar sesión para realizar esta prueba. El sistema no detecta un usuario autenticado.';
      toast({
        variant: 'destructive',
        title: 'Error de Autenticación',
        description: authErrorMsg,
      });
      setExecutionResult({ status: 'Error de Autenticación', message: authErrorMsg });
      return;
    }

    setIsLoading(true);
    setExecutionResult({ status: 'Enviando...', message: `Intentando escribir en la colección \`diagnosis_logs\` como usuario ${currentUser.email}...` });
    
    try {
      const docRef = await addDoc(collection(db, 'diagnosis_logs'), {
        test: 'simple_connection_test',
        user: currentUser.email,
        createdAt: serverTimestamp(),
      });
      const successMsg = `¡Éxito! Se ha escrito un documento en Firestore con el ID: ${docRef.id}. La conexión es correcta y las reglas de seguridad lo permiten.`;
      toast({
        title: 'Conexión Exitosa',
        description: 'Se ha verificado la escritura en Firestore.',
      });
      setExecutionResult({ status: 'Éxito', message: successMsg });
    } catch (error: any) {
      console.error('Error en la prueba de conexión:', error);
      let errorMsg = `No se pudo escribir en Firestore. Código de error: ${error.code}. Detalles: ${error.message}`;
      
      setExecutionResult({ status: 'Error', message: errorMsg });
      toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: `No se pudo escribir en Firestore. Detalles: ${error.message}`,
        duration: 9000,
      });
       
      // Call AI for diagnosis
      setIsAiLoading(true);
      try {
        const diagnosis = await diagnoseFirebaseConnection({ errorCode: error.code, errorMessage: error.message });
        setAiDiagnosis(diagnosis);
      } catch (aiError) {
        console.error('Error getting AI diagnosis:', aiError);
        // Handle AI error silently or show a small notification
      } finally {
        setIsAiLoading(false);
      }

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
        <CardFooter className="flex-col items-start gap-4">
            <Alert variant={executionResult.status === 'Error' || executionResult.status === 'Error de Autenticación' ? 'destructive' : (executionResult.status === 'Éxito' ? 'default' : 'default')}
                className={executionResult.status === 'Éxito' ? 'border-green-500' : ''}
            >
                <AlertTitle className="font-headline">Resultado de Ejecución: {executionResult.status}</AlertTitle>
                <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                    {executionResult.message}
                </AlertDescription>
            </Alert>
        </CardFooter>
      </Card>

      
      <Card className="w-full max-w-2xl">
          <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <BrainCircuit className="text-primary" />
                  Diagnóstico por IA
              </CardTitle>
              <CardDescription>
                  Si la prueba de conexión falla, el asistente de IA analizará el error y sugerirá los siguientes pasos.
              </CardDescription>
          </CardHeader>
          <CardContent>
              {isAiLoading ? (
                  <div className="space-y-4">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                       <Skeleton className="h-4 w-1/3 mt-4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                  </div>
              ) : aiDiagnosis ? (
                  <div className="space-y-4 text-sm">
                      <div>
                          <h4 className="font-semibold text-primary">Análisis del Problema</h4>
                          <p className="text-muted-foreground">{aiDiagnosis.analysis}</p>
                      </div>
                       <div>
                          <h4 className="font-semibold text-primary">Pasos Sugeridos</h4>
                          <div className="prose prose-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: aiDiagnosis.suggestedSteps.replace(/\n/g, '<br />') }} />
                      </div>
                  </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Esperando un error de conexión para iniciar el diagnóstico...
                </div>
              )}
          </CardContent>
      </Card>
      


      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Formulario de Prueba Completo</CardTitle>
          <CardDescription>
            Si la prueba rápida funciona, utiliza este formulario para simular la creación de un ticket y verificar que todos los datos se guardan correctamente.
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
                 {isAuthLoading ? 'Verificando Auth...' : 'Guardar en Firestore'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

    </div>
  );
}
