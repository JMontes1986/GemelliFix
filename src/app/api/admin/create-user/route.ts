
// /app/api/admin/create-user/route.ts
import { NextResponse } from 'next/server';
import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { headers } from 'next/headers';

// This is very important. The Admin SDK does not work in the Edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force_dynamic';

// Initialize Admin SDK once
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FB_PROJECT_ID!,
      clientEmail: process.env.FB_CLIENT_EMAIL!,
      // When using .env.local, the private key needs to be parsed correctly
      privateKey: (process.env.FB_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(req: Request) {
  try {
    // 1. Verify the admin's token to ensure they are authorized
    const headersList = headers();
    const authorization = headersList.get('Authorization');
    
    if (!authorization) {
        return NextResponse.json({ error: 'Authorization header is missing.' }, { status: 401 });
    }

    const token = authorization.split('Bearer ')[1];
    if (!token) {
        return NextResponse.json({ error: 'Bearer token is missing.' }, { status: 401 });
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    if (decodedToken.role !== 'Administrador') {
        return NextResponse.json({ error: 'Only administrators can create users.' }, { status: 403 });
    }

    // 2. Now proceed with user creation
    const { name, email, password, role, avatar } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Create the user in Firebase Authentication
    const userRecord = await getAuth().createUser({
      displayName: name,
      email,
      password,
      photoURL: avatar || undefined,
    });

    // Set custom claims for the new user (for role-based access)
    await getAuth().setCustomUserClaims(userRecord.uid, { role: role });

    // Create user document in Firestore (Admin SDK ignores security rules)
    await getFirestore().collection('users').doc(userRecord.uid).set({
      id: userRecord.uid,
      uid: userRecord.uid,
      name,
      email,
      role,
      avatar: avatar || null,
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true, uid: userRecord.uid }, { status: 201 });
  } catch (err: any) {
    console.error('[create-user] ERROR:', err);
    let message = err?.message ?? 'An internal server error occurred.';
    if (err.code === 'auth/email-already-exists') {
        message = 'The email address is already in use by another account.';
    } else if (err.code === 'auth/invalid-password') {
        message = 'The password must be a string with at least 6 characters.';
    }
    
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// (optional) useful for quick testing from the browser
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Admin user creation endpoint is active.' });
}

    