
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

/**
 * Creates the Firebase Admin app instance with credentials from environment variables.
 * This function is the single source of truth for Admin SDK initialization.
 * @returns {App} The initialized Firebase Admin app instance.
 */
function createAdminApp(): App {
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  // CRUCIAL: Replace escaped newlines `\\n` with actual newlines `\n`
  // to ensure the PEM private key format is valid.
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase Admin environment variables are not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are correctly configured.'
    );
  }

  try {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // Provide a more specific and helpful error message for easier debugging.
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    // Re-throw any other initialization errors.
    throw error;
  }
}

/**
 * Gets the singleton Firebase Admin app instance,
 * initializing it only if it doesn't already exist.
 * This prevents re-initialization on hot reloads.
 * @returns {App} The Firebase Admin app instance.
 */
export function getAdminApp(): App {
  // If the app is already initialized, return it.
  if (getApps().length > 0) {
    return getApps()[0];
  }
  // Otherwise, create a new instance.
  return createAdminApp();
}
