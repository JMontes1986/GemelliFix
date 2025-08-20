
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
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
    const [technicians, setTechnicians] = React.useState<User[]>([]);
    const [isLoadingTechnicians, setIsLoadingTechnicians] = React.useState(true);
    const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
    const [isUpdating, setIsUpdating] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);
    const [activeTab, setActiveTab] = React.useState("users");
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
        const q = query(collection(db, 'users'), orderBy('name'));
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

        const q_technicians = query(collection(db, 'users'), where('role', '==', 'Servicios Generales'), orderBy('name'));
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
        setAvatarFile(null);
        setAvatarPreview(null);
        setIsEditDialogOpen(true);
    };

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

    const handleUserUpdate = async () => {
        if (!selectedUser) return;
        setIsUpdating(true);
        const userDocRef = doc(db, 'users', selectedUser.id);
        let newAvatarUrl = selectedUser.avatar;

        try {
            if (avatarFile) {
                toast({ title: 'Subiendo nueva imagen...', description: 'Por favor espera.'});
                const avatarRef = ref(storage, `avatars/${selectedUser.id}/${avatarFile.name}`);
                const uploadResult = await uploadBytes(avatarRef, avatarFile);
                newAvatarUrl = await getDownloadURL(uploadResult.ref);
            }

            await updateDoc(userDocRef, {
                name: selectedUser.name,
                role: selectedUser.role,
                avatar: newAvatarUrl,
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

    const handlePasswordReset = async () => {
        if (!selectedUser) return;
        try {
            await sendPasswordResetEmail(auth, selectedUser.email);
            toast({
                title: 'Correo de Restablecimiento Enviado',
                description: `Se ha enviado un correo a ${selectedUser.email} con instrucciones.`,
            });
        } catch (error) {
            console.error('Error sending password reset email:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'No se pudo enviar el correo de restablecimiento.',
            });
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

    const handleCreateUser = async () => {
        const { name, email, password, role } = newUserForm;
        if (!name || !email || !password || !role) {
          toast({ variant: 'destructive', title: 'Error', description: 'Por favor, completa todos los campos.' });
          return;
        }
        setIsUpdating(true);
        try {
          // This is a temporary auth client to create the user, then we sign out and let them log in.
          const tempAuth = auth;
          const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password);
          const user = userCredential.user;
          await updateProfile(user, { displayName: name });
    
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            uid: user.uid,
            name,
            email,
            role,
            avatar: `https://placehold.co/100x100.png`,
          });
          
          toast({ title: 'Usuario Creado', description: 'El nuevo usuario ha sido registrado con éxito.' });
          setIsNewUserDialogOpen(false);
          setNewUserForm({ name: '', email: '', password: '', role: '' });
        } catch (error: any) {
          console.error('Error creating user:', error);
          let description = 'Ocurrió un error inesperado.';
          if (error.code === 'auth/email-already-in-use') {
            description = 'Este correo electrónico ya está en uso.';
          } else if (error.code === 'auth/weak-password') {
            description = 'La contraseña debe tener al menos 6 caracteres.';
          }
          toast({ variant: 'destructive', title: 'Error al Crear Usuario', description });
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
                    <div className="relative flex justify-center mb-4 group">
                        <Avatar className="h-24 w-24 border-4 border-primary">
                          <AvatarImage src={avatarPreview || selectedUser.avatar} alt={selectedUser.name} />
                          <AvatarFallback className="text-4xl">{selectedUser.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="h-8 w-8 text-white" />
                        </label>
                        <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                    </div>
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
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Contraseña</Label>
                         <Button variant="outline" className="col-span-3" onClick={handlePasswordReset}>
                            Enviar Correo de Restablecimiento
                        </Button>
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
      
      <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription>
              Completa los datos para registrar un nuevo usuario en la plataforma.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-name" className="text-right">Nombre</Label>
              <Input
                id="new-user-name"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="col-span-3"
                placeholder="Nombre Completo"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-email" className="text-right">Email</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="col-span-3"
                placeholder="correo@ejemplo.com"
              />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-password" className="text-right">Contraseña</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className="col-span-3"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="new-user-role" className="text-right">Rol</Label>
              <Select
                value={newUserForm.role}
                onValueChange={(value: User['role']) => setNewUserForm({ ...newUserForm, role: value })}
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewUserDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 animate-spin" />}
              Crear Usuario
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
        <TabsList className="grid w-full grid-cols-5">
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
                <Button onClick={() => setIsNewUserDialogOpen(true)}>
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
              <CardTitle className="font-headline">Personal de Servicios Generales</CardTitle>
              <CardDescription>
                Usuarios con el rol de Servicios Generales asignados en el sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
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
                    technicians.map((user) => (
                        <TableRow key={user.id}>
                        <TableCell>
                            <Avatar>
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
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
