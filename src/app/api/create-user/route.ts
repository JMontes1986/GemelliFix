
import { type NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';
import { serviceAccount } from '@/lib/firebase-admin-config';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  initializeApp({
    credential: require('firebase-admin').credential.cert(serviceAccount),
  });
}

const auth = getAuth();
const db = getFirestore();

export async function POST(req: NextRequest) {
    try {
        const { email, password, name, role, avatar } = await req.json();

        if (!email || !password || !name || !role) {
            return NextResponse.json({ message: 'Todos los campos son requeridos.' }, { status: 400 });
        }

        // Create user in Firebase Authentication
        const userRecord = await auth.createUser({
            email,
            password,
            displayName: name,
            photoURL: avatar || '',
        });

        // Set the custom role claim
        await auth.setCustomUserClaims(userRecord.uid, { role });
        
        // Save user data to Firestore
        const userData = {
            id: userRecord.uid,
            uid: userRecord.uid,
            name,
            email,
            role,
            avatar: userRecord.photoURL || 'https://placehold.co/100x100.png',
        };

        await db.collection('users').doc(userRecord.uid).set(userData);

        return NextResponse.json({ uid: userRecord.uid }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating user:', error);
        
        let errorMessage = 'Error interno del servidor.';
        let statusCode = 500;

        switch (error.code) {
            case 'auth/email-already-exists':
                errorMessage = 'El correo electrónico ya está en uso por otra cuenta.';
                statusCode = 409; // Conflict
                break;
            case 'auth/invalid-email':
                errorMessage = 'El formato del correo electrónico no es válido.';
                statusCode = 400;
                break;
            case 'auth/weak-password':
                errorMessage = 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
                statusCode = 400;
                break;
            default:
                errorMessage = error.message;
        }
        
        return NextResponse.json({ message: errorMessage }, { status: statusCode });
    }
}
