
// app/api/admin/create-user/route.ts
export const runtime = 'nodejs'; // Evita el runtime de Edge
export const dynamic = 'force-dynamic'; // Evita el pre-renderizado en el build

import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebaseAdmin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export async function POST(req: Request) {
  try {
    const { name, email, password, role, avatar } = await req.json();

    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const decodedToken = await auth.verifyIdToken(idToken);
    const userClaims = (await auth.getUser(decodedToken.uid)).customClaims;
    
    if (userClaims?.role !== 'Administrador') {
      return NextResponse.json({ error: 'Only administrators can create users.' }, { status: 403 });
    }

    const userRec = await auth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
    });

    await db.collection('users').doc(userRec.uid).set({
      id: userRec.uid,
      uid: userRec.uid,
      name,
      email,
      role,
      avatar: avatar || null,
      createdAt: new Date(),
    });
    
    // The onUserCreated Cloud Function will automatically set the custom claim.

    return NextResponse.json({ ok: true, uid: userRec.uid });

  } catch (err: any) {
    console.error('[API create-user] Error:', err);
    
    let message = 'An unknown error occurred.';
    let status = 500;

    if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
        message = 'Admin session is invalid or expired. Please log out and log in again.';
        status = 401;
    } else if (err.message?.includes('Firebase Admin environment variables are not set')) {
        message = 'Server-side Firebase Admin credentials are not configured. Check your environment variables.';
        status = 500;
    } else if (err.message?.includes('Failed to parse Firebase private key')) {
        message = 'Server-side Firebase Admin credentials are not formatted correctly. Ensure the private key is stored correctly.';
        status = 500;
    } else if (err.code === 'auth/email-already-exists') {
        message = 'The email address is already in use by another account.';
        status = 409;
    } else if (err.code === 'auth/invalid-password') {
        message = 'The password must be a string with at least 6 characters.';
        status = 400;
    } else if (err.message) {
        message = err.message;
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
