import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

const projectId = process.env.FB_PROJECT_ID;
const clientEmail = process.env.FB_CLIENT_EMAIL;

// Normaliza la clave privada para asegurar que los saltos de línea sean correctos
const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  throw new Error('Missing Firebase Admin SDK environment variables (FB_PROJECT_ID, FB_CLIENT_EMAIL, FB_PRIVATE_KEY)');
}

let adminApp: App;

if (getApps().length === 0) {
  adminApp = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} else {
  adminApp = getApp();
}

export { adminApp };
