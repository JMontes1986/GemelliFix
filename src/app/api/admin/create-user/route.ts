
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

    const adminApp = getAdminApp(); // Use the robust, centralized getAdminApp function
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Check custom claims from the decoded token for the 'Administrador' role.
    // This is more secure and efficient than a DB lookup.
    if (decodedToken.role !== 'Administrador') {
      return NextResponse.json({ error: 'Only administrators can create users.' }, { status: 403 });
    }

    const userRec = await auth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
    });

    // The onUserCreated Cloud Function will automatically set the custom claim for the role.
    // This API route is only responsible for creating the user and their Firestore document.
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
    console.error('[API create-user] Error:', err);
    
    let message = 'An unknown error occurred.';
    let status = 500;

    if (err.message?.includes('Firebase Admin environment variables are not set')) {
        message = 'Server-side Firebase Admin credentials are not configured. Check your environment variables (FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY_B64).';
        status = 500;
    } else if (err.message?.includes('Failed to parse Firebase private key')) {
        message = 'Server-side Firebase Admin credentials are not formatted correctly. Ensure the FB_PRIVATE_KEY_B64 is a valid Base64 string.';
        status = 500;
    } else if (err.code === 'auth/id-token-expired' || err.code === 'auth/argument-error' || err.code === 'auth/id-token-revoked') {
        message = 'Admin session is invalid or expired. Please log out and log in again.';
        status = 401;
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
