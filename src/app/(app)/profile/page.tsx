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
import { users } from '@/lib/data';

const currentUser = users[0]; // Hardcoded admin user

export default function ProfilePage() {
  return (
    <div className="flex justify-center items-start pt-8">
        <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                    <AvatarFallback className="text-4xl">{currentUser.name.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
            <CardTitle className="font-headline text-2xl">{currentUser.name}</CardTitle>
            <CardDescription>{currentUser.role}</CardDescription>
        </CardHeader>
        <CardContent>
            <form className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" defaultValue={currentUser.name} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" defaultValue={currentUser.email} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Input id="role" defaultValue={currentUser.role} disabled />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Cambiar Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password_confirm">Confirmar Contraseña</Label>
                <Input id="password_confirm" type="password" placeholder="••••••••" />
            </div>
            </form>
        </CardContent>
        <CardFooter>
            <Button className="w-full">Guardar Cambios</Button>
        </CardFooter>
        </Card>
    </div>
  );
}
