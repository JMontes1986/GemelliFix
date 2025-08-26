
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

  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  // Prioritize the new Base64 encoded key
  const privateKeyB64 = process.env.FB_PRIVATE_KEY_B64;

  if (!projectId || !clientEmail || !privateKeyB64) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY_B64 are correctly configured in your .env file.'
    );
  }

  try {
    // Decode the Base64 private key
    const privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf-8');
    
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted and Base64 encoded in your environment variables.');
    }
    throw error;
  }
}
