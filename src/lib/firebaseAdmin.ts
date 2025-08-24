
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
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey: formattedPrivateKey }),
    }, 'firebase-admin-app'); // Nombre único para la app
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    throw error;
  }
}

export function getAdminApp(): App {
  const adminApp = getApps().find(app => app.name === 'firebase-admin-app');
  if (adminApp) {
    return adminApp;
  }
  return createAdminApp();
}
