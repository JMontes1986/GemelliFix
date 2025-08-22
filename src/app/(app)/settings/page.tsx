
'use client';

import * as React from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
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
import { PlusCircle, Loader2, Camera, UploadCloud } from 'lucide-react';
import { categories as initialCategories, sites as initialSites, zones as initialZones } from '@/lib/data';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { collection, onSnapshot, doc, updateDoc, query, where, addDoc, serverTimestamp, setDoc, orderBy, writeBatch, getDoc } from 'firebase/firestore';
import { db, auth, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { sendPasswordResetEmail } from 'firebase/auth';
import type { User, Zone, Site, Category, Log } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ClientFormattedDate } from '@/components/ui/client-formatted-date';


const userRoles: User['role'][] = ['Administrador', 'SST', 'Servicios Generales', 'Docentes', 'Coordinadores', 'Administrativos'];


const getLogActionBadgeVariant = (action: Log['action']) => {
    if (action.startsWith('update')) return 'secondary';
    if (action === 'login') return 'default';
    return 'outline';
}


export default function SettingsPage() {
    const router = useRouter();
    const { toast } = useToast();

    const [currentUser, setCurrentUser] = React.useState<User | null>(null);
    const [authReady, setAuthReady] = React.useState(false);
    
    const [allUsers, setAllUsers] = React.useState<User[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = React.useState(true);
    const [isUpdating, setIsUpdating] = React.useState(false);
    
    // State for avatar management in dialog
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = React.useState<string | null>(null);
    
    const [zones, setZones] = React.useState<Zone[]>([]);
    const [sites, setSites] = React.useState<Site[]>([]);
    const [categories, setCategories] = React.useState<Category[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = React.useState(true);
    const [isLocationDialogOpen, setIsLocationDialogOpen] = React.useState(false);
    const [editingLocation, setEditingLocation] = React.useState<{type: 'zone' | 'site' | 'category', data: Zone | Site | Category} | null>(null);
    
    // State for creating new locations
    const [isNewZoneDialogOpen, setIsNewZoneDialogOpen] = React.useState(false);
    const [newZoneName, setNewZoneName] = React.useState('');
    const [isNewSiteDialogOpen, setIsNewSiteDialogOpen] = React.useState(false);
    const [newSiteName, setNewSiteName] = React.useState('');
    const [newSiteZoneId, setNewSiteZoneId] = React.useState('');
    const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');

    
    // State for creating new user
    const [isNewUserDialogOpen, setIsNewUserDialogOpen] = React.useState(false);
    const [newUserForm, setNewUserForm] = React.useState({ name: '', email: '', password: '', role: '' as User['role'] | '' });

    // State for editing a user
    const [editingUser, setEditingUser] = React.useState<User | null>(null);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = React.useState(false);

    // State for logs
    const [logs, setLogs] = React.useState<Log[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = React.useState(true);


    // State for system settings
    const [slaTimes, setSlaTimes] = React.useState({
        urgent: 12,
        high: 24,
        medium: 36,
        low: 48,
    });
    const [notificationPrefs, setNotificationPrefs] = React.useState({
        newTicket: true,
        assigned: true,
        slaRisk: true,
        resolved: false,
    });

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (fbUser) => {
          if (!fbUser) {
            setCurrentUser(null);
            setAuthReady(true);
            return;
          }
          try {
            await fbUser.getIdToken(true);
            const snap = await getDoc(doc(db, 'users', fbUser.uid));
            setCurrentUser(snap.exists() ? ({ id: snap.id, ...snap.data() } as User) : null);
          } catch(error) {
            console.warn('Error refreshing token, using cached user data', error);
            // Fallback to cached data if token refresh fails, to prevent logout loops
            const snap = await getDoc(doc(db, 'users', fbUser.uid));
            if (snap.exists()) {
                setCurrentUser({ id: snap.id, ...snap.data() } as User);
            } else {
                setCurrentUser(null);
                router.push('/login'); // only redirect if user doc is confirmed missing
            }
          } finally {
            setAuthReady(true);
          }
        });
        return () => unsub();
      }, [router]);
    
    React.useEffect(() => {
        if (!currentUser || currentUser.role !== 'Administrador') {
            setIsLoadingUsers(false);
            setIsLoadingLocations(false);
            setIsLoadingLogs(false);
            return;
        };

        const usersQuery = query(collection(db, 'users'), orderBy('name'));
        const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
            const fetchedUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(fetchedUsers);
            setIsLoadingUsers(false);
        }, (error) => {
            console.error("Error fetching users:", error);
            toast({
                variant: "destructive",
                title: "Error al Cargar Usuarios",
                description: "No se pudieron cargar los usuarios. Revisa las reglas de seguridad y los índices de Firestore.",
                duration: 10000,
            });
            setIsLoadingUsers(false);
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
        
        const qCategories = query(collection(db, 'categories'), orderBy('name'));
        const unsubCategories = onSnapshot(qCategories, (snapshot) => {
            const fetchedCategories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(fetchedCategories);
        });
        
        const qLogs = query(collection(db, 'logs'), orderBy('timestamp', 'desc'));
        const unsubLogs = onSnapshot(qLogs, (snapshot) => {
            const fetchedLogs: Log[] = [];
            snapshot.forEach((doc) => {
                fetchedLogs.push({ id: doc.id, ...doc.data() } as Log);
            });
            setLogs(fetchedLogs);
            setIsLoadingLogs(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setIsLoadingLogs(false);
        });

        return () => {
            unsubUsers();
            unsubZones();
            unsubSites();
            unsubCategories();
            unsubLogs();
        };
    }, [currentUser, toast]);
    
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
    
    const handleLocationEditClick = (type: 'zone' | 'site' | 'category', data: Zone | Site | Category) => {
        setEditingLocation({ type, data: { ...data } });
        setIsLocationDialogOpen(true);
    };

    const handleLocationUpdate = async () => {
        if (!editingLocation) return;
        setIsUpdating(true);
        const { type, data } = editingLocation;
        const collectionName = type === 'zone' ? 'zones' : type === 'site' ? 'sites' : 'categories';
        const docRef = doc(db, collectionName, data.id);

        try {
            await updateDoc(docRef, { name: data.name });
            toast({ title: `${type === 'zone' ? 'Zona' : type === 'site' ? 'Sitio' : 'Categoría'} Actualizada`, description: 'El nombre se ha guardado.' });
            setIsLocationDialogOpen(false);
            setEditingLocation(null);
        } catch (error) {
            console.error(`Error updating ${type}:`, error);
            toast({ variant: 'destructive', title: 'Error', description: `No se pudo actualizar.` });
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

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) {
            toast({ variant: 'destructive', title: 'Error', description: 'El nombre de la categoría no puede estar vacío.' });
            return;
        }
        setIsUpdating(true);
        try {
            await addDoc(collection(db, 'categories'), {
                name: newCategoryName,
                createdAt: serverTimestamp()
            });
            toast({ title: 'Categoría Creada', description: 'La nueva categoría se ha guardado correctamente.' });
            setIsNewCategoryDialogOpen(false);
            setNewCategoryName('');
        } catch (error) {
            console.error('Error creating category:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo crear la nueva categoría.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleCreateUser = async () => {
        if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.role) {
            toast({ variant: 'destructive', title: 'Error', description: 'Todos los campos son requeridos.' });
            return;
        }
        setIsUpdating(true);
        
        let newAvatarUrl = 'https://placehold.co/100x100.png';

        try {
            if (avatarFile) {
                // Temporarily upload avatar with a placeholder name, will rename folder after user creation
                const tempAvatarRef = ref(storage, `avatars/temp/${Date.now()}-${avatarFile.name}`);
                const uploadResult = await uploadBytes(tempAvatarRef, avatarFile);
                newAvatarUrl = await getDownloadURL(uploadResult.ref);
            }
            
            const idToken = await auth.currentUser?.getIdToken();

            const response = await fetch('/api/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`,
                },
                body: JSON.stringify({ ...newUserForm, avatar: newAvatarUrl }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en el servidor');
            }

            toast({ title: 'Usuario Creado', description: 'El nuevo usuario ha sido registrado.' });
            
            setIsNewUserDialogOpen(false);
            setNewUserForm({ name: '', email: '', password: '', role: '' });
            setAvatarFile(null);
            setAvatarPreview(null);
    
        } catch (error: any) {
            console.error('Error creating user:', error);
            toast({ variant: 'destructive', title: 'Error al crear usuario', description: error.message });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleEditUserClick = (user: User) => {
        setEditingUser(user);
        setIsEditUserDialogOpen(true);
    };

    const handleUpdateUser = async () => {
        if (!editingUser) return;

        setIsUpdating(true);
        const userRef = doc(db, "users", editingUser.id);
        
        try {
            await updateDoc(userRef, {
                name: editingUser.name,
                role: editingUser.role
            });
            toast({ title: 'Usuario Actualizado', description: 'La información del usuario ha sido guardada.' });
            setIsEditUserDialogOpen(false);
            setEditingUser(null);
        } catch (error) {
            console.error('Error updating user:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la información del usuario.' });
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleSendPasswordReset = async (email: string) => {
        setIsUpdating(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({ title: 'Correo enviado', description: `Se ha enviado un correo para restablecer la contraseña a ${email}.` });
        } catch (error) {
            console.error('Error sending password reset:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo enviar el correo de restablecimiento.' });
        } finally {
            setIsUpdating(false);
        }
    }


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

    const handleSeedData = async () => {
        setIsUpdating(true);
        try {
            const batch = writeBatch(db);

            // Seed Zones
            initialZones.forEach(zone => {
                const docRef = doc(db, "zones", zone.id);
                batch.set(docRef, zone);
            });

            // Seed Sites
            initialSites.forEach(site => {
                const docRef = doc(db, "sites", site.id);
                batch.set(docRef, site);
            });
            
            // Seed Categories
            initialCategories.forEach(category => {
                const docRef = doc(db, "categories", category.id);
                batch.set(docRef, category);
            });

            await batch.commit();
            toast({
                title: '¡Datos Cargados!',
                description: 'Las zonas, sitios y categorías iniciales se han guardado en Firestore.'
            });

        } catch (error) {
            console.error("Error seeding data:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudieron cargar los datos maestros.'});
        } finally {
            setIsUpdating(false);
        }
    };

  if (!authReady) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Acceso Denegado</CardTitle>
                <CardDescription>Debes iniciar sesión para acceder a la Configuración.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={() => router.push('/login')}>Ir a Iniciar Sesión</Button>
            </CardContent>
        </Card>
    )
  }
        
  if (currentUser.role !== 'Administrador') {
      return (
          <Card>
              <CardHeader>
                  <CardTitle>Acceso Denegado</CardTitle>
                  <CardDescription>No tienes permisos para ver esta página.</CardDescription>
              </CardHeader>
               <CardContent>
                  <Button onClick={() => router.push('/tickets')}>Ir a Mis Tickets</Button>
              </CardContent>
          </Card>
      )
  }

  return (
    <div className="space-y-6">
      
       <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar {editingLocation?.type}</DialogTitle>
                </DialogHeader>
                {editingLocation && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="location-name" className="text-right">Nombre</Label>
                            <Input
                                id="location-name"
                                value={editingLocation.data.name}
                                onChange={(e) => setEditingLocation(prev => prev ? {
                                    ...prev,
                                    data: { ...prev.data, name: e.target.value }
                                } : null)}
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

        <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Crear Nueva Categoría</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="new-category-name" className="text-right">Nombre</Label>
                        <Input
                            id="new-category-name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            className="col-span-3"
                            placeholder="Ej: Aires Acondicionados"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNewCategoryDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreateCategory} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                        Guardar Categoría
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
        
        <Dialog open={isNewUserDialogOpen} onOpenChange={setIsNewUserDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    <DialogDescription>Completa el formulario para añadir un nuevo miembro al sistema.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="relative flex justify-center mb-4 group">
                        <Avatar className="h-24 w-24 border-4 border-primary">
                          <AvatarImage src={avatarPreview || ''} />
                          <AvatarFallback className="text-4xl">?</AvatarFallback>
                        </Avatar>
                        <label htmlFor="avatar-upload-new" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="h-8 w-8 text-white" />
                        </label>
                        <input id="avatar-upload-new" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                      </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-user-name">Nombre Completo</Label>
                        <Input id="new-user-name" placeholder="John Doe" value={newUserForm.name} onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-user-email">Correo Electrónico</Label>
                        <Input id="new-user-email" type="email" placeholder="john.doe@example.com" value={newUserForm.email} onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new-user-password">Contraseña</Label>
                        <Input id="new-user-password" type="password" value={newUserForm.password} onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="new-user-role">Rol</Label>
                         <Select onValueChange={(v: User['role']) => setNewUserForm({ ...newUserForm, role: v })} value={newUserForm.role}>
                            <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                            <SelectContent>{userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
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
        
        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Editar Usuario</DialogTitle>
                </DialogHeader>
                 {editingUser && (
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-name">Nombre Completo</Label>
                            <Input id="edit-user-name" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-email">Correo Electrónico</Label>
                            <Input id="edit-user-email" type="email" value={editingUser.email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-user-role">Rol</Label>
                            <Select onValueChange={(v: User['role']) => setEditingUser({ ...editingUser, role: v })} value={editingUser.role}>
                                <SelectTrigger><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                                <SelectContent>{userRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2 pt-4">
                            <Label>Gestión de Contraseña</Label>
                            <Button variant="secondary" className="w-full" onClick={() => handleSendPasswordReset(editingUser.email)} disabled={isUpdating}>
                                {isUpdating && <Loader2 className="mr-2 animate-spin" />}
                                Enviar Correo de Restablecimiento
                            </Button>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleUpdateUser} disabled={isUpdating}>
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

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
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
                            <CardDescription>Añade, edita o gestiona los usuarios del sistema.</CardDescription>
                        </div>
                        <Button size="sm" onClick={() => setIsNewUserDialogOpen(true)}><PlusCircle className="mr-2" /> Nuevo Usuario</Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingUsers ? (
                                <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                            ) : allUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell><Badge variant="secondary">{user.role}</Badge></TableCell>
                                    <TableCell>
                                        <Button variant="outline" size="sm" onClick={() => handleEditUserClick(user)}>Editar</Button>
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
                        <Button onClick={() => setIsNewCategoryDialogOpen(true)}>
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
                      {isLoadingLocations ? (
                          <TableRow><TableCell colSpan={2} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                      ) : categories.map((category) => (
                        <TableRow key={category.id}>
                          <TableCell className="font-medium">{category.name}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" onClick={() => handleLocationEditClick('category', category)}>Editar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="logs">
           <Card>
            <CardHeader>
                <CardTitle className="font-headline">Logs de Auditoría del Sistema</CardTitle>
                <CardDescription>
                    Aquí se muestra un registro cronológico de las acciones importantes realizadas en la plataforma.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuario</TableHead>
                            <TableHead>Acción</TableHead>
                            <TableHead>Detalles</TableHead>
                            <TableHead className="text-right">Fecha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingLogs ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                                </TableCell>
                            </TableRow>
                        ) : logs.length === 0 ? (
                             <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No hay registros de logs para mostrar.
                                </TableCell>
                            </TableRow>
                        ) : (
                            logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">
                                        <div className="font-semibold">{log.userName}</div>
                                        <div className="text-xs text-muted-foreground">{log.userEmail}</div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={getLogActionBadgeVariant(log.action)}>
                                            {log.action.replace('_', ' ').toUpperCase()}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {log.details.ticketCode ? (
                                            <>
                                                Ticket <Link href={`/tickets/${log.details.ticketId}`} className="text-primary hover:underline">{log.details.ticketCode}</Link>
                                                {log.details.field && <span> - Campo: {log.details.field}</span>}
                                                {log.details.oldValue && <span>, Antes: '{log.details.oldValue}'</span>}
                                                {log.details.newValue && <span>, Ahora: '{log.details.newValue}'</span>}
                                            </>
                                        ) : (
                                            log.action === 'login' && 'Inicio de sesión exitoso.'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ClientFormattedDate date={log.timestamp?.toDate()} options={{ dateStyle: 'medium', timeStyle: 'short' }} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
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
                        Parámetros avanzados y carga de datos iniciales.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4 p-4 border rounded-lg">
                     <h3 className="text-lg font-medium text-primary">Carga de Datos Maestros</h3>
                     <p className="text-sm text-muted-foreground">
                        Usa este botón para poblar la base de datos con los datos iniciales de Zonas, Sitios y Categorías. Esto solo es necesario hacerlo una vez.
                     </p>
                     <Button onClick={handleSeedData} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <UploadCloud className="mr-2"/>
                        Cargar Datos Maestros
                     </Button>
                  </div>
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
                            <Label htmlFor="sla-medium">Prioridad Media (horas)</Label>
                            <Input id="sla-medium" type="number" value={slaTimes.medium} onChange={(e) => setSlaTimes({...slaTimes, medium: +e.target.value})} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="sla-low">Prioridad Baja (horas)</Label>
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
      </Tabs>
    </div>
  );
}
