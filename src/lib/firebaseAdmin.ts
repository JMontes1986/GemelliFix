
import { cert, getApps, initializeApp, App, Credential } from "firebase-admin/app";

/**
 * Retrieves the singleton instance of the Firebase Admin App.
 * If it's not already initialized, it will be created using the
 * credentials from the environment variables.
 * @returns {App} The initialized Firebase Admin App.
 */
export function getAdminApp(): App {
  const apps = getApps();
  // If the app is already initialized, return it to prevent re-initialization.
  if (apps.length) {
    return apps[0];
  }

  // Otherwise, initialize it with the decoded credentials.
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
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM') || error.message?.includes('parse')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    throw error;
  }
}
