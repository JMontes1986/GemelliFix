
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GemelliFixLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: '¡Bienvenido de nuevo!',
        description: 'Has iniciado sesión correctamente.',
      });
      
      // Redirect based on user email
      if (userCredential.user.email === 'sistemas@colgemelli.edu.co') {
        router.push('/dashboard');
      } else {
        router.push('/tickets');
      }

    } catch (error: any) {
      console.error("Error de inicio de sesión:", error);
      toast({
        variant: 'destructive',
        title: 'Error al iniciar sesión',
        description: 'Las credenciales son incorrectas. Por favor, verifica tu correo y contraseña.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-48">
              <GemelliFixLogo />
            </div>
          </div>
          <CardTitle className="text-2xl font-headline">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@gemelli.edu.co"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="#"
                  className="ml-auto inline-block text-sm underline"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Ingresar'}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="underline font-bold">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
