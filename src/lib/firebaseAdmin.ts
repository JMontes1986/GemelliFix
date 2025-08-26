
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This is the central and robust function for accessing the Admin App instance.
 * @returns {App} The initialized Firebase Admin App.
 */
function createAdminApp(): App {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  // The Base64 encoded key is the most reliable way to handle private keys in env variables.
  const privateKeyB64 = process.env.FB_PRIVATE_KEY_B64;

  if (!projectId || !clientEmail || !privateKeyB64) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY_B64 are correctly configured in your .env file.'
    );
  }

  try {
    // Decode the Base64 private key to its original format.
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

/**
 * Retrieves the singleton instance of the Firebase Admin App.
 * If it's not already initialized, it will be created.
 * @returns {App} The initialized Firebase Admin App.
 */
export function getAdminApp(): App {
  // getApps() returns an array of all initialized apps. If it's not empty,
  // we can safely get the default app instance.
  if (getApps().length > 0) {
    return getApp();
  }
  // Otherwise, we create a new app instance.
  return createAdminApp();
}
