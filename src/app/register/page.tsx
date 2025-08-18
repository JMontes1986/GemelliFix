
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

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="text-center space-y-4">
           <div className="flex justify-center">
              <GemelliFixLogo className="w-48" />
            </div>
          <CardTitle className="text-2xl font-headline">Crear Cuenta de Administrador</CardTitle>
          <CardDescription>
            Completa el formulario para registrarte.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4">
             <div className="grid gap-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input id="name" placeholder="Ej: Admin User" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@gemelli.edu.co"
                required
              />
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}"
                  title="Debe contener al menos un número, una mayúscula, una minúscula, y al menos 8 o más caracteres"
                />
                 <p className="text-xs text-muted-foreground">
                    Debe contener mayúsculas, minúsculas y números.
                </p>
            </div>
            <Link href="/dashboard" className='w-full'>
                <Button type="submit" className="w-full">
                    Crear Cuenta
                </Button>
            </Link>
          </form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="underline font-bold">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
