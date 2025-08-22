
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

function createAdminApp(): App {
  // Asegúrate de que las variables de entorno están definidas.
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  const rawKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !rawKey) {
    throw new Error("Firebase Admin environment variables are not set.");
  }
  
  // Reemplaza los caracteres de nueva línea escapados con saltos de línea reales.
  const privateKey = rawKey.replace(/\\n/g, '\n');

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

/**
 * Obtiene la instancia de la aplicación de administrador de Firebase,
 * inicializándola solo si no existe ya una.
 * @returns {App} La instancia de la aplicación de administrador.
 */
export function getAdminApp(): App {
  return getApps().length > 0 ? getApp() : createAdminApp();
}
