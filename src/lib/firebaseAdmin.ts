// src/lib/firebaseAdmin.ts
import * as admin from 'firebase-admin';

let app: admin.app.App | undefined;

function normalizePem(pem: string) {
  // Corrige escapeos, retornos de carro, comillas y espacios
  let key = pem.replace(/\\n/g, '\n').replace(/\r/g, '');
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
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
      throw new Error('FIREBASE_ADMIN_B64 no contiene el campo "private_key".');
    }
    parsed.private_key = normalizePem(parsed.private_key);

    if (!parsed.private_key.includes('BEGIN PRIVATE KEY')) {
      throw new Error('La clave privada decodificada de B64 no es un PEM válido (falta el encabezado "BEGIN PRIVATE KEY").');
    }
    return admin.credential.cert(parsed as admin.ServiceAccount);
  } catch (e: any) {
     throw new Error(
      `Falló el parseo de FIREBASE_ADMIN_B64: ${e.message}. Asegúrate de que es el contenido completo del JSON en formato base64.`
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
    throw new Error('La variable FB_PRIVATE_KEY no contiene una clave PEM válida (falta el encabezado "BEGIN PRIVATE KEY").');
  }

  return admin.credential.cert({ projectId, clientEmail, privateKey });
}

export function getAdminApp() {
  if (app) return app;

  const cred =
    fromBase64() ??
    fromFields() ??
    (() => { throw new Error('No se encontraron credenciales de Firebase Admin. Define la variable FIREBASE_ADMIN_B64 (recomendado) o el conjunto de variables FB_PROJECT_ID, FB_CLIENT_EMAIL y FB_PRIVATE_KEY.'); })();

  app = admin.apps.length ? admin.app() : admin.initializeApp({ credential: cred });
  return app;
}

export function getAdminAuth() { return getAdminApp().auth(); }
export function getAdminFirestore() { return getAdminApp().firestore(); }
