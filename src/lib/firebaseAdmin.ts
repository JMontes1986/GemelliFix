// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

function fromBase64() {
  const b64 = process.env.FIREBASE_ADMIN_B64;
  if (!b64) return null;

  try {
    const json = Buffer.from(b64, 'base64').toString('utf8');
    const parsed = JSON.parse(json);

    // En algunos entornos la key llega con \\n
    if (parsed.private_key?.includes('\\n')) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }

    return admin.credential.cert(parsed as admin.ServiceAccount);
  } catch (e) {
    throw new Error(
      'Failed to parse FIREBASE_ADMIN_B64. Asegúrate de que es el JSON completo en base64 (sin comillas).'
    );
  }
}

function fromFields() {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  let privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  // Corregir saltos de línea escapados. Es la causa más común de errores de "parseo".
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FB_PRIVATE_KEY no parece una clave válida (no contiene "BEGIN PRIVATE KEY").');
  }

  return admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  });
}

export function getAdminApp() {
  if (app) return app;

  const cred =
    fromBase64() ??
    fromFields() ??
    (() => {
      throw new Error(
        'No hay credenciales de Firebase Admin. Define FIREBASE_ADMIN_B64 o (FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY).'
      );
    })();

  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({ credential: cred });

  return app;
}

export function getAdminAuth() {
  return getAdminApp().auth();
}

export function getAdminFirestore() {
  return getAdminApp().firestore();
}
