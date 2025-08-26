
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

/**
 * Ensures that the Firebase Admin SDK is initialized only once.
 * This is the central function for accessing the Admin App instance.
 * @returns {App} The initialized Firebase Admin App.
 */
export function getAdminApp(): App {
  // If the default app is already initialized, return it.
  if (getApps().length > 0) {
    return getApp();
  }

  // Otherwise, create a new app.
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
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    throw error;
  }
}
