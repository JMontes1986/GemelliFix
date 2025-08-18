
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    role: '',
    password: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewUser((prev) => ({ ...prev, [id]: value }));
  };

  const handleRoleChange = (value: string) => {
    setNewUser((prev) => ({ ...prev, role: value }));
  };

  const handleCreateUser = () => {
    // Aquí iría la lógica para guardar en Firebase/Firestore
    console.log('Creating user:', newUser);
    toast({
      title: 'Usuario Creado (Simulación)',
      description: `El usuario ${newUser.name} con el rol ${newUser.role} ha sido creado.`,
    });
    // Reset form
    setNewUser({ name: '', email: '', role: '', password: '' });
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona la configuración de tu cuenta y las preferencias de la aplicación.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
            <h2 className="text-lg font-headline font-semibold">Perfil</h2>
            <p className="text-sm text-muted-foreground">Actualiza tu información personal y de contacto.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Información del Perfil</CardTitle>
                    <CardDescription>Estos datos se mostrarán a otros usuarios.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input id="name" defaultValue="Admin User" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" type="email" defaultValue="admin@gemelli.edu.co" />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button>Guardar Cambios</Button>
                </CardFooter>
            </Card>
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <h2 className="text-lg font-headline font-semibold">Gestión de Usuarios</h2>
          <p className="text-sm text-muted-foreground">
            Añade nuevos usuarios al sistema.
          </p>
        </div>
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Crear Nuevo Usuario</CardTitle>
              <CardDescription>
                Completa los datos para registrar un nuevo usuario en la plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" placeholder="Ej: Juan Pérez" value={newUser.name} onChange={handleInputChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@gemelli.edu.co" value={newUser.email} onChange={handleInputChange}/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-user-role">Rol</Label>
                <Select onValueChange={handleRoleChange} value={newUser.role}>
                  <SelectTrigger id="new-user-role">
                    <SelectValue placeholder="Seleccionar un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="tech">Técnico</SelectItem>
                    <SelectItem value="requester">Solicitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña Temporal</Label>
                <Input id="password" type="password" value={newUser.password} onChange={handleInputChange} />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateUser}>Crear Usuario</Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Separator />

       <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
            <h2 className="text-lg font-headline font-semibold">Notificaciones</h2>
            <p className="text-sm text-muted-foreground">Elige cómo quieres recibir las notificaciones.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Preferencias de Notificación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="email-notifications">Notificaciones por Correo</Label>
                            <p className="text-xs text-muted-foreground">Recibir alertas de tickets y actualizaciones en tu email.</p>
                        </div>
                        <Switch id="email-notifications" defaultChecked />
                    </div>
                     <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                            <Label htmlFor="push-notifications">Notificaciones Push</Label>
                             <p className="text-xs text-muted-foreground">Recibir notificaciones en tiempo real en tus dispositivos.</p>
                        </div>
                        <Switch id="push-notifications" />
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

       <Separator />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
            <h2 className="text-lg font-headline font-semibold">Apariencia</h2>
            <p className="text-sm text-muted-foreground">Personaliza el aspecto de la aplicación.</p>
        </div>
        <div className="md:col-span-2">
            <Card>
                 <CardHeader>
                    <CardTitle>Tema de la Aplicación</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label htmlFor="theme">Tema</Label>
                        <Select defaultValue="system">
                            <SelectTrigger id="theme">
                                <SelectValue placeholder="Seleccionar tema" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Claro</SelectItem>
                                <SelectItem value="dark">Oscuro</SelectItem>
                                <SelectItem value="system">Sistema</SelectItem>
                            </SelectContent>
                        </Select>
                         <p className="text-xs text-muted-foreground">Elige entre un tema claro, oscuro o el predeterminado de tu sistema.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>

    </div>
  );
}
