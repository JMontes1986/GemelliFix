
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { User } from '@/lib/types';

const userRoles: User['role'][] = ['Administrador', 'Servicios Generales', 'Docentes', 'Coordinadores', 'Administrativos'];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<User['role'] | ''>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      toast({
        variant: 'destructive',
        title: 'Error de validación',
        description: 'Por favor, selecciona un rol.',
      });
      return;
    }
    setIsLoading(true);

    try {
      // Crear usuario en Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Actualizar el perfil de Firebase Auth con el nombre
      await updateProfile(user, { displayName: name });

      // Guardar información adicional en Firestore, usando el UID como ID del documento.
      await setDoc(doc(db, 'users', user.uid), {
        id: user.uid, // Usamos el uid como id para consistencia
        uid: user.uid,
        name: name,
        email: email,
        role: role,
        avatar: `https://placehold.co/100x100.png`
      });

      toast({
        title: '¡Cuenta Creada!',
        description: 'Tu cuenta ha sido registrada con éxito.',
      });
      router.push('/login');
    } catch (error: any) {
      console.error("Error de registro:", error);
      let description = 'Ocurrió un error inesperado. Por favor, inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        description = 'Este correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        description = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
      }
      toast({
        variant: 'destructive',
        title: 'Error de Registro',
        description: description,
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
          <CardTitle className="text-2xl font-headline">Crear Cuenta</CardTitle>
          <CardDescription>
            Completa el formulario para registrar un nuevo usuario.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="grid gap-4">
             <div className="grid gap-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input 
                id="name" 
                placeholder="Ej: Admin User" 
                required 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
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
                <Label htmlFor="role">Rol de Usuario</Label>
                <Select onValueChange={(value: User['role']) => setRole(value)} value={role} disabled={isLoading}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                        {userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  pattern=".{6,}"
                  title="Debe tener al menos 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                 <p className="text-xs text-muted-foreground">
                    Mínimo 6 caracteres.
                </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Crear Cuenta'}
            </Button>
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
