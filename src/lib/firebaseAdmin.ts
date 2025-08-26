
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin SDK, ensuring it's only done once.
 * This is the central and robust function for accessing the Admin App instance.
 * @returns {App} The initialized Firebase Admin App.
 */
function createAdminApp(): App {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are correctly configured in your .env file.'
    );
  }

  try {
    // This is the crucial step: replace the literal '\n' characters from the
    // environment variable with actual newline characters.
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
