
// app/api/admin/create-user/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getAdminApp } from '@/lib/firebaseAdmin';

export async function POST(req: Request) {
  try {
    const { name, email, password, role, avatar } = await req.json();

    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }
    
    // Usar la función centralizada para obtener la app de admin
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

    // Set role as a custom claim for security and efficiency
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
    
    // Captura el error específico de parseo de credenciales si ocurre aquí
    if (err.message.includes('Firebase Admin environment variables are not set')) {
        message = 'Server-side Firebase Admin credentials are not configured correctly.';
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
