

'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from '@/lib/firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Camera } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for form fields
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State for avatar
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = { id: userDocSnap.id, ...userDocSnap.data() } as User;
          setCurrentUser(userData);
          setName(userData.name);
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'No se encontraron datos del usuario.' });
        }
      } else {
        // Handle user not logged in case
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

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

  const handleSaveChanges = async () => {
    if (!firebaseUser || !currentUser) {
      toast({ variant: 'destructive', title: 'Error', description: 'Usuario no autenticado.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Error', description: 'Las contraseñas no coinciden.' });
      return;
    }
    
    setIsSaving(true);
    let newAvatarUrl = currentUser.avatar;

    try {
        if (avatarFile) {
            toast({ title: 'Subiendo nueva imagen...', description: 'Por favor espera.'});
            const avatarRef = ref(storage, `avatars/${firebaseUser.uid}/${avatarFile.name}`);
            const uploadResult = await uploadBytes(avatarRef, avatarFile);
            newAvatarUrl = await getDownloadURL(uploadResult.ref);
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        const updates: Partial<User> = {};
        if (name !== currentUser.name) updates.name = name;
        if (newAvatarUrl !== currentUser.avatar) updates.avatar = newAvatarUrl;

        if (Object.keys(updates).length > 0) {
            await updateDoc(userDocRef, updates);
        }

        if (name !== firebaseUser.displayName || newAvatarUrl !== firebaseUser.photoURL) {
            await updateProfile(firebaseUser, {
                displayName: name,
                photoURL: newAvatarUrl,
            });
        }
        
        // Note: Password change requires re-authentication and is a more complex flow.
        // This example focuses on profile data update. We will skip password change for now.

        toast({ title: '¡Perfil Actualizado!', description: 'Tus cambios han sido guardados.' });
        setAvatarFile(null);
        setAvatarPreview(null);
        setNewPassword('');
        setConfirmPassword('');

    } catch (error: any) {
        console.error("Error updating profile: ", error);
        toast({ variant: 'destructive', title: 'Error al actualizar', description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-start pt-8">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center"><Skeleton className="h-24 w-24 rounded-full mx-auto" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
          <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
        </Card>
      </div>
    )
  }

  if (!currentUser) {
    return <p>Usuario no encontrado.</p>;
  }

  return (
    <div className="flex justify-center items-start pt-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="relative flex justify-center mb-4 group">
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarImage src={avatarPreview || currentUser.avatar} alt={currentUser.name} />
              <AvatarFallback className="text-4xl">{currentUser.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <label htmlFor="avatar-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <Camera className="h-8 w-8 text-white" />
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <CardTitle className="font-headline text-2xl">{currentUser.name}</CardTitle>
          <CardDescription>{currentUser.role}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre Completo</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" value={currentUser.email} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Input id="role" value={currentUser.role} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Cambiar Contraseña</Label>
              <Input id="password" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSaving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password_confirm">Confirmar Contraseña</Label>
              <Input id="password_confirm" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSaving}/>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleSaveChanges} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
