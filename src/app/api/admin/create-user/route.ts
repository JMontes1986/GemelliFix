
// app/api/admin/create-user/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Helper function to get the initialized Firebase Admin app
// This is defined locally to ensure it's robust and self-contained.
function getAdminApp(): App {
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = process.env.FB_PROJECT_ID;
    const clientEmail = process.env.FB_CLIENT_EMAIL;
    // CRUCIAL: Replace escaped newlines with actual newlines
    const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are in your .env file.'
        );
    }

    try {
        return initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
        });
    } catch (error: any) {
        // Provide a more specific error message for easier debugging.
        if (error.code === 'app/invalid-credential' || (error.message && (error.message.includes('PEM') || error.message.includes('parse')))) {
            throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
        }
        throw error;
    }
}


export async function POST(req: Request) {
  try {
    const { name, email, password, role, avatar } = await req.json();

    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    // Initialize Admin SDK reliably inside the request function
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const decodedToken = await auth.verifyIdToken(idToken);
    
    const callerClaims = (await auth.getUser(decodedToken.uid)).customClaims;
    if (callerClaims?.role !== 'Administrador') {
        return NextResponse.json({ error: 'Only administrators can create users.' }, { status: 403 });
    }

    const userRec = await auth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
    });

    await auth.setCustomUserClaims(userRec.uid, { role: role });
    
    await db.collection('users').doc(userRec.uid).set({
      id: userRec.uid,
      uid: userRec.uid,
      name,
      email,
      role,
      avatar: avatar || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, uid: userRec.uid });
  } catch (err: any) {
    console.error('create-user error:', err);
    let message = 'An unknown error occurred on the server.';
    
    // Capture the specific error messages for better client-side feedback.
    if (err.message && err.message.includes('Failed to parse Firebase private key')) {
        message = 'Server-side Firebase Admin credentials are not configured correctly. The private key format is invalid.';
    } else if (err.code === 'auth/email-already-exists') {
        message = 'The email address is already in use by another account.';
    } else if (err.code === 'auth/invalid-password') {
        message = 'The password must be a string with at least 6 characters.';
    } else if (err.message) {
        message = err.message;
    }
    
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
