

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
import { collection, addDoc, serverTimestamp, type DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Zap, BrainCircuit, AlertTriangle, CalendarPlus, UserPlus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { diagnoseFirebaseConnection, type FirebaseDiagnosisOutput } from '@/ai/flows/diagnose-firebase-connection';
import { diagnoseCalendarCreation } from '@/ai/flows/diagnose-calendar-creation';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { addDays } from 'date-fns';


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
  
  // State for isolated calendar test
  const [isolatedDate, setIsolatedDate] = React.useState<Date | undefined>(new Date());
  const [isolatedTitle, setIsolatedTitle] = React.useState('');


  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const runAiDiagnosis = async (params: { flow: 'connection' | 'calendar', errorCode?: string, errorMessage?: string, symptom?: string }) => {
      setIsAiLoading(true);
      setAiDiagnosis(null);
      try {
        let diagnosis;
        if (params.flow === 'connection') {
            diagnosis = await diagnoseFirebaseConnection(params);
        } else {
            diagnosis = await diagnoseCalendarCreation(params);
        }
        setAiDiagnosis(diagnosis);
      } catch (aiError) {
        console.error('Error getting AI diagnosis:', aiError);
        setAiDiagnosis({
            analysis: "Error del Asistente de IA",
            suggestedSteps: "No se pudo obtener una respuesta del asistente de IA. Por favor, revisa la consola del navegador para ver posibles errores de red."
        });
      } finally {
        setIsAiLoading(false);
      }
  }


  const handleSimpleConnectionTest = async () => {
    setAiDiagnosis(null);
    setIsLoading(true);

    if (isAuthLoading) {
      const authWaitMsg = 'Esperando la confirmación de autenticación de Firebase...';
      setExecutionResult({ status: 'Verificando Auth...', message: authWaitMsg });
      setIsLoading(false);
      return;
    }
    
    if (!currentUser) {
      const authErrorMsg = 'Debes iniciar sesión para realizar esta prueba. El sistema no detecta un usuario autenticado.';
      setExecutionResult({ status: 'Error de Autenticación', message: authErrorMsg });
      setIsLoading(false);
      runAiDiagnosis({ flow: 'connection', errorCode: 'unauthenticated', errorMessage: authErrorMsg });
      return;
    }

    setExecutionResult({ status: 'Enviando...', message: `Intentando escribir en la colección \`diagnosis_logs\` como usuario ${currentUser.email}...` });
    
    const TIMEOUT_SYMBOL = Symbol();
    const timeoutPromise = new Promise((resolve) => 
      setTimeout(() => resolve(TIMEOUT_SYMBOL), 5000)
    );

    try {
      const writePromise = addDoc(collection(db, 'diagnosis_logs'), {
        test: 'simple_connection_test',
        user: currentUser.email,
        createdAt: serverTimestamp(),
      });

      const result = await Promise.race([writePromise, timeoutPromise]);
      
      if (result === TIMEOUT_SYMBOL) {
        throw new Error('Connection timeout');
      }
      
      const docRef = result as DocumentReference;
      const successMsg = `¡Éxito! Se ha escrito un documento en Firestore con el ID: ${docRef.id}. La conexión es correcta y las reglas de seguridad lo permiten.`;
      setExecutionResult({ status: 'Éxito', message: successMsg });

    } catch (error: any) {
      console.error('Error en la prueba de conexión:', error);
      let errorMsg = `No se pudo escribir en Firestore. Código de error: ${error.code}. Detalles: ${error.message}`;

      if (error.message === 'Connection timeout') {
          errorMsg = "La conexión con Firestore ha tardado demasiado (más de 5 segundos) y ha sido cancelada. Esto usualmente indica que la base de datos no ha sido creada en la consola de Firebase o hay un problema de red.";
          runAiDiagnosis({ flow: 'connection', symptom: "La conexión con Firestore se queda colgada y no responde (timeout)." });
      } else {
          runAiDiagnosis({ flow: 'connection', errorCode: error.code, errorMessage: error.message });
      }
      
      setExecutionResult({ status: 'Error', message: errorMsg });
      toast({
        variant: 'destructive',
        title: 'Error de Conexión',
        description: error.message,
        duration: 9000,
      });

    } finally {
        setIsLoading(false);
    }
  };

  const handleCalendarTest = async () => {
    setAiDiagnosis(null);
    setIsLoading(true);

     if (!currentUser) {
      const authErrorMsg = 'Debes iniciar sesión para realizar esta prueba. El sistema no detecta un usuario autenticado.';
      setExecutionResult({ status: 'Error de Autenticación', message: authErrorMsg });
      setIsLoading(false);
      runAiDiagnosis({ flow: 'calendar', errorCode: 'unauthenticated', errorMessage: authErrorMsg });
      return;
    }

    setExecutionResult({ status: 'Enviando...', message: `Intentando crear un evento en la colección \`scheduleEvents\`...` });

    const testEvent = {
        title: 'Evento de Prueba de Diagnóstico',
        description: `Creado por ${currentUser.email} en ${new Date().toISOString()}`,
        start: new Date().toISOString(),
        end: new Date(new Date().getTime() + 60 * 60 * 1000).toISOString(),
        type: 'task' as const,
        technicianId: currentUser.uid
    };

    try {
        const docRef = await addDoc(collection(db, "scheduleEvents"), testEvent);
        const successMsg = `¡Éxito! Se creó un evento de prueba en el calendario con el ID: ${docRef.id}. La escritura en la colección 'scheduleEvents' es correcta.`;
        setExecutionResult({ status: 'Éxito', message: successMsg });
    } catch (error: any) {
        console.error('Error en la prueba de calendario:', error);
        const errorMsg = `No se pudo crear el evento en el calendario. Código de error: ${error.code}. Detalles: ${error.message}`;
        setExecutionResult({ status: 'Error', message: errorMsg });
        runAiDiagnosis({ flow: 'calendar', errorCode: error.code, errorMessage: error.message });
        toast({
            variant: 'destructive',
            title: 'Error al Crear Evento',
            description: error.message,
            duration: 9000,
        });
    } finally {
        setIsLoading(false);
    }
  };

    const handleIsolatedCalendarTest = async () => {
        if (!isolatedDate || !isolatedTitle) {
            toast({ variant: 'destructive', title: 'Campos requeridos', description: 'Por favor, selecciona una fecha y escribe un título.' });
            return;
        }
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'No autenticado', description: 'Debes iniciar sesión para esta prueba.' });
            return;
        }

        setIsLoading(true);
        try {
            const startDateTime = new Date(isolatedDate);
            startDateTime.setHours(9, 0, 0); // Set to 9am
            const endDateTime = addDays(startDateTime, 1);

            const testEvent = {
                title: isolatedTitle,
                description: 'Evento de prueba aislado',
                start: startDateTime.toISOString(),
                end: endDateTime.toISOString(),
                type: 'task' as const,
                technicianId: currentUser.uid
            };

            const docRef = await addDoc(collection(db, 'scheduleEvents'), testEvent);
            toast({ title: '¡Evento de Prueba Creado!', description: `El evento se guardó en Firestore con el ID: ${docRef.id}.` });
        } catch (error: any) {
            console.error("Error en la prueba de calendario aislada:", error);
            toast({ variant: 'destructive', title: 'Error al Crear Evento', description: error.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleUserCreationTest = async () => {
      setAiDiagnosis(null);
      setIsLoading(true);
  
      if (!currentUser) {
        const authErrorMsg = 'Debes iniciar sesión para realizar esta prueba. El sistema no detecta un usuario autenticado.';
        setExecutionResult({ status: 'Error de Autenticación', message: authErrorMsg });
        setIsLoading(false);
        return;
      }
      
      const testUser = {
        name: `Usuario de Prueba ${Date.now()}`,
        email: `test-${Date.now()}@gemellifix.com`,
        password: 'password123',
        role: 'Docentes',
        avatar: 'https://placehold.co/100x100.png'
      };

      setExecutionResult({ status: 'Enviando...', message: `Intentando crear usuario de prueba: ${testUser.email}` });

      try {
        const idToken = await currentUser.getIdToken();
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify(testUser),
        });
  
        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json')
          ? await res.json()
          : { error: await res.text() };
  
        if (!res.ok) {
          throw new Error(payload.error || `Error HTTP: ${res.status}`);
        }
  
        const successMsg = `¡Éxito! Se ha creado el usuario de prueba con UID: ${payload.uid}. Revisa Authentication y Firestore.`;
        setExecutionResult({ status: 'Éxito', message: successMsg });
        toast({ title: 'Prueba Exitosa', description: successMsg });
  
      } catch (error: any) {
        console.error('Error en la prueba de creación de usuario:', error);
        setExecutionResult({ status: 'Error', message: error.message });
        toast({
          variant: 'destructive',
          title: 'Error en la Prueba',
          description: error.message,
          duration: 9000,
        });
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
      
      <Card className="w-full max-w-2xl border-yellow-500 border-2 bg-yellow-50">
        <CardHeader>
           <CardTitle className="font-headline text-2xl flex items-center gap-3">
              <AlertTriangle className="text-yellow-600 h-8 w-8" />
              Acción Requerida: Problema de Conexión
            </CardTitle>
          <CardDescription className="text-yellow-800">
             Si la aplicación se queda en "Enviando..." y nunca termina, la causa más común (99% de las veces) es que **la base de datos de Cloud Firestore no ha sido creada**.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-yellow-900">
           <p>Aunque tu proyecto de Firebase exista, debes inicializar la base de datos manualmente. Es un paso obligatorio.</p>
            <ol className="list-decimal list-inside space-y-2 font-medium">
              <li>Ve a la <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline font-bold">Consola de Firebase</a>.</li>
              <li>Selecciona tu proyecto: <strong>gemellifix</strong>.</li>
              <li>En el menú de la izquierda, ve a <strong>Compilación → Firestore Database</strong>.</li>
              <li>Si ves un botón grande que dice <strong>"Crear base de datos"</strong>, haz clic en él.</li>
              <li>Sigue los pasos (se recomienda el modo de producción) para crearla.</li>
            </ol>
            <p>Una vez que la base de datos esté creada, esta prueba de conexión debería funcionar.</p>
        </CardContent>
      </Card>
      
       <Card className="w-full max-w-2xl border-yellow-500 border-2 bg-yellow-50">
          <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-3">
                  <AlertTriangle className="text-yellow-600 h-8 w-8" />
                  Diagnóstico: No se carga el personal de Servicios Generales
              </CardTitle>
              <CardDescription className="text-yellow-800">
                  Si la pestaña de "Servicios Generales" en Configuración aparece vacía o con un error, es casi seguro que falta un índice en Firestore.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-yellow-900">
              <p>La aplicación necesita consultar a los usuarios que tienen el rol "Servicios Generales" y ordenarlos por nombre. Para que esta operación funcione, Firestore requiere un <strong>índice compuesto</strong>.</p>
              <p className="font-medium">Solución: Debes añadir el siguiente bloque de código a tu archivo <code className="bg-yellow-200/50 px-1 py-0.5 rounded">firestore.indexes.json</code>:</p>
              <pre className="bg-yellow-200/50 p-4 rounded-md text-xs overflow-x-auto">
                  <code>
{`
    {
      "collectionGroup": "users",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
`}
                  </code>
              </pre>
              <p>Asegúrate de añadirlo dentro del array <code className="bg-yellow-200/50 px-1 py-0.5 rounded">"indexes"</code> existente, sin eliminar los otros índices. Después de guardar el cambio, el sistema debería aplicar la configuración.</p>
          </CardContent>
      </Card>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Prueba de Conexión Rápida</CardTitle>
          <CardDescription>
            Usa este botón para realizar una prueba de escritura simple y directa a Firestore. Esto ayuda a verificar rápidamente si las reglas de seguridad y la configuración del proyecto son correctas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleSimpleConnectionTest} disabled={isLoading || isAuthLoading} className="w-full">
            {(isLoading || isAuthLoading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isAuthLoading ? 'Verificando Auth...' : 'Verificando...'}
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
          <CardTitle className="font-headline text-2xl">Prueba de Creación de Evento en Calendario</CardTitle>
          <CardDescription>
            Este botón intenta crear un evento de prueba en la colección `scheduleEvents` para verificar si las reglas de seguridad específicas del calendario son correctas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCalendarTest} disabled={isLoading || isAuthLoading} className="w-full">
            {(isLoading || isAuthLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <CalendarPlus className="mr-2 h-4 w-4" />
            Probar Creación de Evento
          </Button>
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Prueba de Creación de Usuario (Admin API)</CardTitle>
          <CardDescription>
            Este botón simula la creación de un usuario nuevo a través del endpoint seguro de la API. Esto verifica que las credenciales de administrador del backend y la lógica de la API funcionen correctamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleUserCreationTest} disabled={isLoading || isAuthLoading} className="w-full">
            {(isLoading || isAuthLoading) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isAuthLoading ? 'Verificando Auth...' : 'Probando...'}
                </>
            ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Ejecutar Prueba de Creación de Usuario
                </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="w-full max-w-2xl">
        <CardHeader>
            <CardTitle className="font-headline text-2xl">Prueba de Creación de Evento (Aislada)</CardTitle>
            <CardDescription>
                Esta prueba guarda un evento directamente en Firestore para verificar el guardado, aislando la lógica de la página del calendario principal.
            </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center">
            <Calendar
                mode="single"
                selected={isolatedDate}
                onSelect={setIsolatedDate}
                className="rounded-md border"
                disabled={isLoading}
            />
            <div className="w-full space-y-4">
                <Input 
                    placeholder="Título del evento de prueba" 
                    value={isolatedTitle}
                    onChange={(e) => setIsolatedTitle(e.target.value)}
                    disabled={isLoading}
                />
                <Button onClick={handleIsolatedCalendarTest} disabled={isLoading || isAuthLoading} className="w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Evento de Prueba
                </Button>
            </div>
        </CardContent>
      </Card>


      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Resultados y Diagnóstico</CardTitle>
          <CardDescription>
              Aquí se mostrará el resultado de la última prueba ejecutada y el análisis de la IA si ocurre un error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Alert variant={executionResult.status === 'Error' || executionResult.status === 'Error de Autenticación' ? 'destructive' : (executionResult.status === 'Éxito' ? 'default' : 'default')}
                className={executionResult.status === 'Éxito' ? 'border-green-500' : ''}
            >
                <AlertTitle className="font-headline">Resultado de Ejecución: {executionResult.status}</AlertTitle>
                <AlertDescription className="font-mono text-xs whitespace-pre-wrap">
                    {executionResult.message}
                </AlertDescription>
            </Alert>
          
              <div className="space-y-4">
                  <h3 className="font-headline text-lg flex items-center gap-2">
                      <BrainCircuit className="text-primary" />
                      Diagnóstico por IA
                  </h3>
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
                              <div className="prose prose-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: aiDiagnosis.suggestedSteps.replace(/\\n/g, '<br />') }} />
                          </div>
                      </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Esperando el resultado de una prueba para iniciar el diagnóstico...
                    </div>
                  )}
              </div>
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
                      <Input placeholder="Ej: Prueba de conexión Firestore" {...field} disabled={isLoading || isAuthLoading} />
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
                        disabled={isLoading || isAuthLoading}
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
