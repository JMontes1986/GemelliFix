// lib/firebaseAdmin.ts
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';

function getPrivateKey(): string {
  const k = process.env.FB_PRIVATE_KEY || '';
  // Normaliza: convierte "\n" a saltos reales y limpia CR
  return k.replace(/\\n/g, '\n').replace(/\r/g, '');
}

let adminApp: App;
if (!getApps().length) {
    const projectId = process.env.FB_PROJECT_ID;
    const clientEmail = process.env.FB_CLIENT_EMAIL;
    const privateKey = getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin env vars (FB_PROJECT_ID / FB_CLIENT_EMAIL / FB_PRIVATE_KEY)');
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
} else {
    adminApp = getApps()[0];
}


export { adminApp };
