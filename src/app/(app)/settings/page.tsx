
'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle } from 'lucide-react';
import { users, technicians, zones, sites, categories } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground">
          Administra los datos maestros y la configuración de la aplicación.
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="technicians">Servicios Generales</TabsTrigger>
          <TabsTrigger value="locations">Zonas y Sitios</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline">Gestión de Usuarios</CardTitle>
                  <CardDescription>
                    Visualiza y gestiona los usuarios de la plataforma.
                  </CardDescription>
                </div>
                <Button>
                  <PlusCircle className="mr-2" /> Crear Usuario
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar>
                          <AvatarImage src={user.avatar} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians">
          <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">Gestión de Servicios Generales</CardTitle>
                        <CardDescription>
                            Define el personal de mantenimiento y sus especialidades.
                        </CardDescription>
                    </div>
                    <Button>
                        <PlusCircle className="mr-2" /> Añadir Personal
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Habilidades</TableHead>
                    <TableHead>Carga</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {technicians.map((tech) => (
                    <TableRow key={tech.id}>
                       <TableCell>
                        <Avatar>
                          <AvatarImage src={tech.avatar} alt={tech.name} />
                          <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{tech.name}</TableCell>
                      <TableCell>{tech.skills.join(', ')}</TableCell>
                      <TableCell>{tech.workload}%</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Editar</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-headline">Zonas</CardTitle>
                                <CardDescription>Áreas principales de la institución.</CardDescription>
                            </div>
                            <Button size="sm"><PlusCircle className="mr-2" /> Nueva Zona</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {zones.map(zone => (
                                    <TableRow key={zone.id}>
                                        <TableCell>{zone.name}</TableCell>
                                        <TableCell><Button variant="outline" size="sm">Editar</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                         </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-headline">Sitios</CardTitle>
                                <CardDescription>Ubicaciones específicas dentro de una zona.</CardDescription>
                            </div>
                             <Button size="sm"><PlusCircle className="mr-2" /> Nuevo Sitio</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead>Zona</TableHead>
                                    <TableHead>Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sites.map(site => (
                                    <TableRow key={site.id}>
                                        <TableCell>{site.name}</TableCell>
                                        <TableCell>{zones.find(z => z.id === site.zoneId)?.name}</TableCell>
                                        <TableCell><Button variant="outline" size="sm">Editar</Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </TabsContent>

        <TabsContent value="categories">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="font-headline">Gestión de Categorías</CardTitle>
                            <CardDescription>
                                Administra las categorías para las solicitudes de mantenimiento.
                            </CardDescription>
                        </div>
                        <Button>
                            <PlusCircle className="mr-2" /> Nueva Categoría
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre de la Categoría</TableHead>
                        <TableHead className="w-[100px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">Editar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
            </Card>
        </TabsContent>

        <TabsContent value="system">
             <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Configuración del Sistema</CardTitle>
                    <CardDescription>
                        Parámetros avanzados como SLAs, notificaciones y más.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">Tiempos de Respuesta (SLA)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="sla-urgent">Prioridad Urgente (horas)</Label>
                            <Input id="sla-urgent" type="number" defaultValue={12} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-high">Prioridad Alta (horas)</Label>
                            <Input id="sla-high" type="number" defaultValue={24} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-medium">Prioridad Media (días)</Label>
                            <Input id="sla-medium" type="number" defaultValue={3} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-low">Prioridad Baja (días)</Label>
                            <Input id="sla-low" type="number" defaultValue={7} />
                        </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-primary">Preferencias de Notificación</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-new-ticket" className="font-semibold">Nuevo Ticket Creado</Label>
                                <p className="text-sm text-muted-foreground">Notificar a los líderes de mantenimiento cuando un usuario crea un ticket.</p>
                            </div>
                            <Switch id="notif-new-ticket" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-assigned" className="font-semibold">Ticket Asignado</Label>
                                <p className="text-sm text-muted-foreground">Notificar al técnico cuando se le asigna un nuevo ticket.</p>
                            </div>
                            <Switch id="notif-assigned" defaultChecked />
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-sla-risk" className="font-semibold">SLA en Riesgo</Label>
                                <p className="text-sm text-muted-foreground">Enviar una alerta cuando un ticket esté a punto de incumplir su SLA.</p>
                            </div>
                             <Switch id="notif-sla-risk" defaultChecked />
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-resolved" className="font-semibold">Ticket Resuelto</Label>
                                <p className="text-sm text-muted-foreground">Notificar al solicitante cuando su ticket ha sido marcado como resuelto.</p>
                            </div>
                            <Switch id="notif-resolved" />
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Guardar Cambios</Button>
                </CardFooter>
            </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
