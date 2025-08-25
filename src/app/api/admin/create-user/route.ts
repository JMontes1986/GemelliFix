
// app/api/admin/create-user/route.ts
export const runtime = 'nodejs'; // Evita el runtime de Edge
export const dynamic = 'force-dynamic'; // Evita el pre-renderizado en el build

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // Importaciones perezosas para que no se evalúen durante el build:
    const [{ getAdminApp }, { getAuth }, { getFirestore }] = await Promise.all([
      import('@/lib/firebaseAdmin'),
      import('firebase-admin/auth'),
      import('firebase-admin/firestore'),
    ]);

    const { name, email, password, role, avatar } = await req.json();

    // Validar token del que llama
    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
        return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const db = getFirestore(adminApp);

    const decodedToken = await auth.verifyIdToken(idToken);
    
    // Se verifica el rol usando el custom claim del token, que es más seguro.
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

    // La Cloud Function `onUserCreated` se encargará de poner el custom claim del rol.
    // Aquí solo guardamos el documento en Firestore.
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
    let message = 'An unknown error occurred.';
    
    if (err.message?.includes('Firebase Admin environment variables are not set')) {
        message = 'Server-side Firebase Admin credentials are not configured. Check your .env file.';
    } else if (err.message?.includes('Failed to parse Firebase private key')) {
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
