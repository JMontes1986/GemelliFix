
// app/api/admin/create-user/route.ts
import 'dotenv/config'; // Asegura que las variables de entorno se carguen primero
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Importaciones dinámicas para asegurar que se cargan en el entorno correcto
    const { getAdminApp } = await import('@/lib/firebaseAdmin');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');

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
      id: userRec.uid, // Asegurar que el id y el uid se guardan
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
    let message = 'An unknown error occurred.';
    if (err.code === 'auth/email-already-exists') {
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
