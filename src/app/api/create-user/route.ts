
import { NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { serviceAccount } from '@/lib/firebase-admin-config';
import { headers } from 'next/headers';

// Initialize Firebase Admin SDK if not already initialized
let adminApp: App;
if (!getApps().length) {
    adminApp = initializeApp({
        credential: {
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key,
        }
    });
} else {
    adminApp = getApps()[0];
}


const authAdmin = getAuth(adminApp);
const dbAdmin = getFirestore(adminApp);

export async function POST(request: Request) {
    const headersList = headers();
    const authorization = headersList.get('Authorization');
    
    if (!authorization) {
        return NextResponse.json({ message: 'Authorization header is missing.' }, { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];

    if (!token) {
        return NextResponse.json({ message: 'Bearer token is missing.' }, { status: 401 });
    }
    
    try {
        // Verify the admin's token to ensure they are authorized
        const decodedToken = await authAdmin.verifyIdToken(token);
        if (decodedToken.role !== 'Administrador') {
            return NextResponse.json({ message: 'Only administrators can create users.' }, { status: 403 });
        }
        
        // Now proceed with user creation
        const { name, email, password, role, avatar } = await request.json();

        if (!name || !email || !password || !role) {
            return NextResponse.json({ message: 'Missing required fields for user creation.' }, { status: 400 });
        }

        const userRecord = await authAdmin.createUser({
            email,
            password,
            displayName: name,
            photoURL: avatar || 'https://placehold.co/100x100.png',
        });
        
        // Set custom claims for the new user (for role-based access)
        await authAdmin.setCustomUserClaims(userRecord.uid, { role });

        // Create user document in Firestore
        const userDocRef = dbAdmin.collection('users').doc(userRecord.uid);
        await userDocRef.set({
            id: userRecord.uid,
            uid: userRecord.uid,
            name: name,
            email: email,
            role: role,
            avatar: avatar || 'https://placehold.co/100x100.png',
        });

        return NextResponse.json({ uid: userRecord.uid, message: 'User created successfully' }, { status: 201 });

    } catch (error: any) {
        console.error('Error creating user:', error);
        let message = 'An unknown error occurred.';
        if (error.code === 'auth/email-already-exists') {
            message = 'The email address is already in use by another account.';
        } else if (error.code === 'auth/invalid-password') {
            message = 'The password must be a string with at least 6 characters.';
        } else if (error.code === 'auth/id-token-expired') {
            message = 'Your session has expired. Please log in again.';
        }
        
        return NextResponse.json({ message: message }, { status: 500 });
    }
}
