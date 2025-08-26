// src/lib/firebaseAdmin.ts
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

function getAdminApp(): App {
  // Si la app ya está inicializada, la devuelve para evitar errores.
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  // Lee las credenciales desde las variables de entorno.
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const privateKey = process.env.FB_PRIVATE_KEY;

  // Valida que todas las variables necesarias estén presentes.
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin environment variables not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are correctly configured in your .env file."
    );
  }

  // Reemplaza los caracteres de escape '\\n' por saltos de línea reales '\n'.
  // Esto es crucial porque las variables de entorno almacenan la clave privada en una sola línea.
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  try {
    // Inicializa y devuelve la app de Firebase Admin.
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });
  } catch (error: any) {
    // Proporciona un mensaje de error más detallado si la inicialización falla.
    console.error("Firebase Admin SDK initialization error:", error.message);
    if (error.code === 'app/invalid-credential' || error.message?.includes('PEM')) {
      throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variables.');
    }
    throw error;
  }
}

export { getAdminApp };
