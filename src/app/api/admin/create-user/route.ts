
// app/api/admin/create-user/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Helper function to get the initialized Firebase Admin app.
// This is self-contained to ensure robustness and prevent bundling issues.
function getAdminApp(): App {
    // If the app is already initialized, return it to avoid re-initialization.
    if (getApps().length > 0) {
        return getApps()[0];
    }

    const projectId = process.env.FB_PROJECT_ID;
    const clientEmail = process.env.FB_CLIENT_EMAIL;
    // CRUCIAL: The private key from environment variables often has escaped newlines.
    // They must be replaced with actual newline characters for the PEM format to be valid.
    const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are in your .env file.'
        );
    }

    try {
        // Initialize the app with the correctly formatted credentials.
        return initializeApp({
            credential: cert({ projectId, clientEmail, privateKey }),
        });
    } catch (error: any) {
        // Provide a more specific and helpful error message for easier debugging.
        if (error.code === 'app/invalid-credential' || (error.message && (error.message.includes('PEM') || error.message.includes('parse')))) {
            throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
        }
        // Re-throw any other initialization errors.
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

    // Verify the token of the user making the request to ensure they are an admin
    const decodedToken = await auth.verifyIdToken(idToken);
    const callerClaims = (await auth.getUser(decodedToken.uid)).customClaims;
    if (callerClaims?.role !== 'Administrador') {
        return NextResponse.json({ error: 'Only administrators can create users.' }, { status: 403 });
    }

    // Create the new user in Firebase Authentication
    const userRec = await auth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
    });

    // Set the user's role as a custom claim on their authentication token
    await auth.setCustomUserClaims(userRec.uid, { role: role });
    
    // Create the corresponding user document in the Firestore 'users' collection
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
