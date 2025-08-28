// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

function normalizePem(pem: string) {
  // Corrige escapeos y retornos de carro
  let key = pem.replace(/\\n/g, '\n').replace(/\r/g, '');
  // Quita comillas envolventes accidentales
  if (key.startsWith('"') && key.endsWith('"')) key = key.slice(1, -1);
  // Quita BOM/whitespace extraño
  key = key.trim().replace(/^\uFEFF/, '');
  return key;
}

function fromBase64() {
  const b64 = process.env.FIREBASE_ADMIN_B64;
  if (!b64) return null;

  try {
    const json = Buffer.from(b64, 'base64').toString('utf8').trim().replace(/^\uFEFF/, '');
    const parsed = JSON.parse(json);
    if (!parsed.private_key) {
      throw new Error('FIREBASE_ADMIN_B64 no contiene "private_key".');
    }
    parsed.private_key = normalizePem(parsed.private_key);

    if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('private_key del B64 no es PEM válido (falta BEGIN/END).');
    }
    return admin.credential.cert(parsed as admin.ServiceAccount);
  } catch (e: any) {
     throw new Error(
      `Failed to parse FIREBASE_ADMIN_B64: ${e.message}. Asegúrate de que es el JSON completo en base64 (sin comillas).`
    );
  }
}

function fromFields() {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  let privateKey = process.env.FB_PRIVATE_KEY;
  if (!projectId || !clientEmail || !privateKey) return null;

  privateKey = normalizePem(privateKey);
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('FB_PRIVATE_KEY no es PEM válido (falta BEGIN/END).');
  }

  return admin.credential.cert({ projectId, clientEmail, privateKey });
}

export function getAdminApp() {
  if (app) return app;

  const cred =
    fromBase64() ??
    fromFields() ??
    (() => { throw new Error('No hay credenciales de Firebase Admin. Define FIREBASE_ADMIN_B64 o (FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY).'); })();

  app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: cred });
  return app;
}

export function getAdminAuth() { return getAdminApp().auth(); }
export function getAdminFirestore() { return getAdminApp().firestore(); }
