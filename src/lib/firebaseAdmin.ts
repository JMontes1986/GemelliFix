
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

function createAdminApp(): App {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  // It is crucial to replace the escaped newlines `\\n` with actual newlines `\n`.
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are in your .env file.'
    );
  }

  try {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } catch (error: any) {
      console.error("Firebase Admin SDK initialization error:", error);
      // Re-throw with a more descriptive message.
      if (error.code === 'app/invalid-credential' || error.message.includes('PEM')) {
        throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
      }
      throw error;
  }
}

/**
 * Gets the Firebase Admin app instance,
 * initializing it only if it doesn't already exist.
 * @returns {App} The Firebase Admin app instance.
 */
export function getAdminApp(): App {
  // Avoid re-initialization in hot-reload environments.
  if (getApps().length > 0) {
    return getApp();
  }
  return createAdminApp();
}
