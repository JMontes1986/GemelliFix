// src/app/api/admin/create-user/route.ts
import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const idToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!idToken) {
      return NextResponse.json({ error: 'Missing Authorization' }, { status: 401 });
    }

    // Verificar que quien llama sea admin
    const auth = getAdminAuth();
    await auth.verifyIdToken(idToken);
    
    const body = await req.json();
    const { name, email, password, role, avatar } = body;

    // 1) Crear usuario en Authentication
    const userRecord = await auth.createUser({
      displayName: name,
      email,
      password,
      photoURL: avatar || undefined,
      disabled: false,
    });

    // 2) Guardar perfil en Firestore
    const db = getAdminFirestore();
    await db.collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      uid: userRecord.uid,
      name,
      email,
      avatar: avatar || 'https://placehold.co/100x100.png',
      role,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid });
  } catch (err: any) {
    let message = `An unknown error occurred: ${err.message || 'No details'}`;
    let status = 500;
    
    if (err?.code === 'auth/email-already-exists') {
        message = 'The email address is already in use by another account.';
        status = 409;
    } else if (err?.code === 'auth/invalid-password') {
        message = 'The password must be a string with at least 6 characters.';
        status = 400;
    } else if (err.message) {
        // Capturamos el error específico de la inicialización si ocurre aquí
        message = err.message;
    }

    // Propaga errores legibles
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
