
// app/api/admin/create-user/route.ts
import 'dotenv/config'; // Asegura que las variables de entorno se carguen primero
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// Esta función es ahora más robusta y verifica el rol del usuario en Firestore.
async function assertAdmin(req: Request) {
    const { getAdminApp } = await import('@/lib/firebaseAdmin');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');

    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
        throw new Error('Unauthorized: Missing ID token.');
    }
    
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const decodedToken = await auth.verifyIdToken(idToken, true); // true for check-revoked
    
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();

    if (!userDoc.exists || userDoc.data()?.role !== 'Administrador') {
        throw new Error('Forbidden: User is not an administrator.');
    }
}


export async function POST(req: Request) {
  try {
    // Las importaciones se hacen dentro del handler para asegurar que el entorno está listo.
    const { getAdminApp } = await import('@/lib/firebaseAdmin');
    const { getAuth } = await import('firebase-admin/auth');
    const { getFirestore } = await import('firebase-admin/firestore');

    // 1. Validar que quien llama es un administrador.
    await assertAdmin(req);

    // 2. Procesar la solicitud.
    const { name, email, password, role, avatar } = await req.json();
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields: name, email, password, role.' }, { status: 400 });
    }

    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    // 3. Crear el usuario en Firebase Authentication.
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      photoURL: avatar || undefined,
    });
    
    // El custom claim se establecerá automáticamente por la Cloud Function `onUserCreated`.
    // 4. Crear el documento del usuario en Firestore.
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid, // Guardamos el ID para consistencia.
      uid: userRecord.uid,
      name,
      email,
      role,
      avatar: avatar || 'https://placehold.co/100x100.png',
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid });

  } catch (err: any) {
    console.error('Error in /api/admin/create-user:', err.message);
    let message = 'An unknown error occurred.';
    let status = 500;

    if (err.message?.includes('Unauthorized')) {
        status = 401;
        message = 'Authorization token is missing or invalid.';
    } else if (err.message?.includes('Forbidden')) {
        status = 403;
        message = 'The requesting user does not have administrator privileges.';
    } else if (err.code === 'auth/email-already-exists') {
        status = 409;
        message = 'The email address is already in use by another account.';
    } else if (err.code === 'auth/invalid-password') {
        status = 400;
        message = 'The password must be a string with at least 6 characters.';
    } else if (err.message) {
        // Captura el error específico de las credenciales si ocurre.
        message = err.message;
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
