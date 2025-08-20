
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
import { PlusCircle, Loader2, Camera } from 'lucide-react';
import { categories } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, doc, updateDoc, query, where, addDoc, serverTimestamp, setDoc, orderBy } from 'firebase/firestore';
import { db, auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
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
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState("locations");
    const { toast } = useToast();
    
    // State for avatar management in dialog
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
    
    const [zones, setZones] = React.useState<Zone[]>([]);
    const [sites, setSites] = React.useState<Site[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = React.useState(true);
    const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
    const [editingLocation, setEditingLocation] = React.useState<{type: 'zone' | 'site', data: Zone | Site} | null>(null);
    
    // State for creating new locations
    const [isNewZoneDialogOpen, setIsNewZoneDialogOpen] = React.useState(false);
    const [newZoneName, setNewZoneName] = React.useState('');
    const [isNewSiteDialogOpen, setIsNewSiteDialogOpen] = React.useState(false);
    const [newSiteName, setNewSiteName] = React.useState('');
    const [newSiteZoneId, setNewSiteZoneId] = React.useState('');
    
    // State for creating new user
    const [isNewUserDialogOpen, setIsNewUserDialogOpen] = React.useState(false);
    const [newUserForm, setNewUserForm] = React.useState({ name: '', email: '', password: '', role: '' as User['role'] | '' });


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
            unsubZones();
            unsubSites();
        };
    }, []);
    
    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.size > 2 * 1024 * 1024) { // 2MB limit
              toast({ variant: 'destructive', title: 'Archivo demasiado grande', description: 'La imagen no puede superar los 2MB.'});
              return;
          }
          setAvatarFile(file);
          setAvatarPreview(URL.createObjectURL(file));
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
    
    const handleCreateZone = async () => {
        if (!newZoneName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre de la zona no puede estar vacío.' });
            return;
        }
        setIsUpdating(true);
        try {
            await addDoc(collection(db, 'zones'), {
                name: newZoneName,
                createdAt: serverTimestamp()
            });
            toast({ title: 'Zona Creada', description: 'La nueva zona se ha guardado correctamente.' });
            setIsNewZoneDialogOpen(false);
            setNewZoneName('');
        } catch (error) {
            console.error('Error creating zone:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la nueva zona.' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCreateSite = async () => {
        if (!newSiteName.trim() || !newSiteZoneId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Debes proporcionar un nombre para el sitio y seleccionar una zona.' });
            return;
        }
        setIsUpdating(true);
        try {
            await addDoc(collection(db, 'sites'), {
                name: newSiteName,
                zoneId: newSiteZoneId,
                createdAt: serverTimestamp()
            });
            toast({ title: 'Sitio Creado', description: 'El nuevo sitio se ha guardado correctamente.' });
            setIsNewSiteDialogOpen(false);
            setNewSiteName('');
            setNewSiteZoneId('');
        } catch (error) {
            console.error('Error creating site:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear el nuevo sitio.' });
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
        
        <Dialog open={isNewZoneDialogOpen} onOpenChange={setIsNewZoneDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Zona</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-zone-name" className="text-right">Nombre</Label>
                        <Input
                            id="new-zone-name"
                            value={newZoneName}
                            onChange={(e) => setNewZoneName(e.target.value)}
                            className="col-span-3"
                            placeholder="Ej: Bloque C - Deportivo"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewZoneDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateZone} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Zona
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        
        <Dialog open={isNewSiteDialogOpen} onOpenChange={setIsNewSiteDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Sitio</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-site-name" className="text-right">Nombre</Label>
                        <Input
                            id="new-site-name"
                            value={newSiteName}
                            onChange={(e) => setNewSiteName(e.target.value)}
                            className="col-span-3"
                            placeholder="Ej: Cancha de Fútbol"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-site-zone" className="text-right">Zona</Label>
                        <Select onValueChange={setNewSiteZoneId} value={newSiteZoneId}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Seleccionar zona" />
                            </SelectTrigger>
                            <SelectContent>
                                {zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewSiteDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateSite} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Sitio
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="locations">Zonas y Sitios</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="logs">Logs del Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="locations">
            <div className="grid md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="font-headline">Zonas</CardTitle>
                                <CardDescription>Áreas principales de la institución.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => setIsNewZoneDialogOpen(true)}><PlusCircle className="mr-2" /> Nueva Zona</Button>
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
                             <Button size="sm" onClick={() => setIsNewSiteDialogOpen(true)}><PlusCircle className="mr-2" /> Nuevo Sitio</Button>
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

    