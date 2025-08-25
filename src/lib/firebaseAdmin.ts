
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

function createAdminApp(): App {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are correctly configured.'
    );
  }

  try {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    // Inicializa la app por defecto, sin un nombre específico.
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: formattedPrivateKey }),
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    throw error;
  }
}

export function getAdminApp(): App {
  // Busca la app por defecto. Si no existe, la crea.
  const adminApp = getApps().find(app => app.name === '[DEFAULT]');
  if (adminApp) {
    return adminApp;
  }
  return getApps().length > 0 ? getApp() : createAdminApp();
}
