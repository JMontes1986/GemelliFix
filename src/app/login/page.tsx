
import Link from 'next/link';
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

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <GemelliFixLogo className="w-48 h-auto" />
            </div>
          <CardTitle className="text-2xl font-headline">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tu correo para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@gemelli.edu.co"
                required
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
              <Input id="password" type="password" required />
            </div>
            <Link href="/dashboard" className='w-full'>
              <Button type="submit" className="w-full">
                Ingresar
              </Button>
            </Link>
          </div>
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
