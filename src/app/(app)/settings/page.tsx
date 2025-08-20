

'use client';

import * as React from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PlusCircle, Loader2 } from 'lucide-react';
import { categories } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { User, Zone, Site } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import LogsPage from './logs/page';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';


const userRoles: User['role'][] = ['Administrador', 'Servicios Generales', 'Docentes', 'Coordinadores', 'Administrativos'];


export default function SettingsPage() {
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
    const [technicians, setTechnicians] = React.useState<User[]>([]);
    const [isLoadingTechnicians, setIsLoadingTechnicians] = React.useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [activeTab, setActiveTab] = React.useState("users");
    const { toast } = useToast();
    
    const [zones, setZones] = React.useState<Zone[]>([]);
    const [sites, setSites] = React.useState<Site[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = React.useState(true);
    const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
    const [editingLocation, setEditingLocation] = React.useState<{type: 'zone' | 'site', data: Zone | Site} | null>(null);


    // State for system settings
    const [slaTimes, setSlaTimes] = React.useState({
        urgent: 12,
        high: 24,
        medium: 3,
        low: 7,
    });
    const [notificationPrefs, setNotificationPrefs] = React.useState({
        newTicket: true,
        assigned: true,
        slaRisk: true,
        resolved: false,
    });


    React.useEffect(() => {
        const q = collection(db, 'users');
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const fetchedUsers: User[] = [];
            querySnapshot.forEach((doc) => {
                fetchedUsers.push({ id: doc.id, ...doc.data() } as User);
            });
            setAllUsers(fetchedUsers);
            setIsLoadingUsers(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los usuarios.' });
            setIsLoadingUsers(false);
        });

        const q_technicians = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'));
        const unsubscribe_technicians = onSnapshot(q_technicians, (querySnapshot) => {
            const fetchedTechnicians: User[] = [];
            querySnapshot.forEach((doc) => {
                fetchedTechnicians.push({ id: doc.id, ...doc.data() } as User);
            });
            setTechnicians(fetchedTechnicians);
            setIsLoadingTechnicians(false);
        }, (error) => {
            console.error("Error fetching technicians:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo cargar el personal de Servicios Generales.' });
            setIsLoadingTechnicians(false);
        });

        const qZones = query(collection(db, 'zones'), orderBy('name'));
        const unsubZones = onSnapshot(qZones, (snapshot) => {
            const fetchedZones = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Zone));
            setZones(fetchedZones);
            setIsLoadingLocations(false);
        });

        const qSites = query(collection(db, 'sites'), orderBy('name'));
        const unsubSites = onSnapshot(qSites, (snapshot) => {
            const fetchedSites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
            setSites(fetchedSites);
        });

        return () => {
            unsubscribe();
            unsubscribe_technicians();
            unsubZones();
            unsubSites();
        };
    }, [toast]);
    
    const handleEditClick = (user: User) => {
        setSelectedUser(user);
        setIsEditDialogOpen(true);
    };

    const handleUserUpdate = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);
        const userDocRef = doc(db, 'users', selectedUser.id);
        try {
            await updateDoc(userDocRef, {
                name: selectedUser.name,
                role: selectedUser.role,
            });
            toast({ title: 'Usuario Actualizado', description: 'Los cambios se han guardado correctamente.' });
            setIsEditDialogOpen(false);
        } catch (error) {
            console.error('Error updating user:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar el usuario.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleLocationEditClick = (type: 'zone' | 'site', data: Zone | Site) => {
        setEditingLocation({ type, data: { ...data } });
        setIsLocationDialogOpen(true);
    };

    const handleLocationUpdate = async () => {
        if (!editingLocation) return;
        setIsUpdating(true);
        const { type, data } = editingLocation;
        const collectionName = type === 'zone' ? 'zones' : 'sites';
        const docRef = doc(db, collectionName, data.id);

        try {
            await updateDoc(docRef, { name: data.name });
            toast({ title: `${type === 'zone' ? 'Zona' : 'Sitio'} Actualizado`, description: 'El nombre se ha guardado.' });
            setIsLocationDialogOpen(false);
            setEditingLocation(null);
        } catch (error) {
            console.error(`Error updating ${type}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar ${type === 'zone' ? 'la zona' : 'el sitio'}.` });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleSystemSave = async () => {
        setIsUpdating(true);
        // Simulate saving to a database
        await new Promise(resolve => setTimeout(resolve, 500));
        toast({
            title: "Configuración Guardada",
            description: "Los cambios en la configuración del sistema han sido guardados.",
        });
        setIsUpdating(false);
    };


  return (
    <div className="space-y-6">
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                    Modifica la información del usuario. Haz clic en "Guardar Cambios" al terminar.
                </DialogDescription>
            </DialogHeader>
            {selectedUser && (
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">Nombre</Label>
                        <Input
                            id="name"
                            value={selectedUser.name}
                            onChange={(e) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">Email</Label>
                        <Input id="email" value={selectedUser.email} className="col-span-3" disabled />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="role" className="text-right">Rol</Label>
                         <Select 
                            value={selectedUser.role} 
                            onValueChange={(value) => setSelectedUser({ ...selectedUser, role: value as User['role'] })}
                         >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecciona un rol" />
                            </SelectTrigger>
                            <SelectContent>
                                {userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleUserUpdate} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                    Guardar Cambios
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar {editingLocation?.type === 'zone' ? 'Zona' : 'Sitio'}</DialogTitle>
                </DialogHeader>
                {editingLocation && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location-name" className="text-right">Nombre</Label>
                            <Input
                                id="location-name"
                                value={editingLocation.data.name}
                                onChange={(e) => setEditingLocation({
                                    ...editingLocation,
                                    data: { ...editingLocation.data, name: e.target.value }
                                })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleLocationUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <div>
        <h1 className="text-2xl font-headline font-bold tracking-tight">Configuración General</h1>
        <p className="text-muted-foreground">
          Administra los datos maestros y la configuración de la aplicación.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="technicians">Servicios Generales</TabsTrigger>
          <TabsTrigger value="locations">Zonas y Sitios</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="logs">Logs del Sistema</TabsTrigger>
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
                  {isLoadingUsers ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                           <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                    </TableRow>
                  ) : (
                    allUsers.map((user) => (
                        <TableRow key={user.id}>
                        <TableCell>
                            <Avatar>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(user)}>Editar</Button>
                        </TableCell>
                        </TableRow>
                    ))
                  )}
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
                    <TableHead>Rol</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingTechnicians ? (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                           <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                        </TableCell>
                    </TableRow>
                  ) : (
                    technicians.map((tech) => (
                        <TableRow key={tech.id}>
                        <TableCell>
                            <Avatar>
                            <AvatarImage src={tech.avatar} alt={tech.name} />
                            <AvatarFallback>{tech.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{tech.name}</TableCell>
                        <TableCell><Badge variant="secondary">{tech.role}</Badge></TableCell>
                        <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleEditClick(tech)}>Editar</Button>
                        </TableCell>
                        </TableRow>
                    ))
                  )}
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
                                {isLoadingLocations ? (
                                    <TableRow><TableCell colSpan={2} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : zones.map(zone => (
                                    <TableRow key={zone.id}>
                                        <TableCell>{zone.name}</TableCell>
                                        <TableCell><Button variant="outline" size="sm" onClick={() => handleLocationEditClick('zone', zone)}>Editar</Button></TableCell>
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
                                {isLoadingLocations ? (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : sites.map(site => (
                                    <TableRow key={site.id}>
                                        <TableCell>{site.name}</TableCell>
                                        <TableCell>{zones.find(z => z.id === site.zoneId)?.name || 'N/A'}</TableCell>
                                        <TableCell><Button variant="outline" size="sm" onClick={() => handleLocationEditClick('site', site)}>Editar</Button></TableCell>
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
                            <Input id="sla-urgent" type="number" value={slaTimes.urgent} onChange={(e) => setSlaTimes({...slaTimes, urgent: +e.target.value})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-high">Prioridad Alta (horas)</Label>
                            <Input id="sla-high" type="number" value={slaTimes.high} onChange={(e) => setSlaTimes({...slaTimes, high: +e.target.value})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-medium">Prioridad Media (días)</Label>
                            <Input id="sla-medium" type="number" value={slaTimes.medium} onChange={(e) => setSlaTimes({...slaTimes, medium: +e.target.value})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-low">Prioridad Baja (días)</Label>
                            <Input id="sla-low" type="number" value={slaTimes.low} onChange={(e) => setSlaTimes({...slaTimes, low: +e.target.value})} />
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
                            <Switch id="notif-new-ticket" checked={notificationPrefs.newTicket} onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, newTicket: checked})} />
                        </div>
                        <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-assigned" className="font-semibold">Ticket Asignado</Label>
                                <p className="text-sm text-muted-foreground">Notificar al técnico cuando se le asigna un nuevo ticket.</p>
                            </div>
                            <Switch id="notif-assigned" checked={notificationPrefs.assigned} onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, assigned: checked})} />
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-sla-risk" className="font-semibold">SLA en Riesgo</Label>
                                <p className="text-sm text-muted-foreground">Enviar una alerta cuando un ticket esté a punto de incumplir su SLA.</p>
                            </div>
                             <Switch id="notif-sla-risk" checked={notificationPrefs.slaRisk} onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, slaRisk: checked})} />
                        </div>
                         <div className="flex items-center justify-between p-4 border rounded-md">
                            <div>
                                <Label htmlFor="notif-resolved" className="font-semibold">Ticket Resuelto</Label>
                                <p className="text-sm text-muted-foreground">Notificar al solicitante cuando su ticket ha sido marcado como resuelto.</p>
                            </div>
                            <Switch id="notif-resolved" checked={notificationPrefs.resolved} onCheckedChange={(checked) => setNotificationPrefs({...notificationPrefs, resolved: checked})} />
                        </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSystemSave} disabled={isUpdating}>
                    {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Cambios
                  </Button>
                </CardFooter>
            </Card>
        </TabsContent>
        <TabsContent value="logs">
            {activeTab === 'logs' ? <LogsPage /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
