
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

// Se utiliza una función para asegurar que las variables de entorno se lean
// en el momento de la ejecución y no durante el build.
function createAdminApp(): App {
  // Las credenciales ahora se leen desde las variables de entorno.
  // Esto es más seguro y flexible que tenerlas en un archivo de configuración.
  const projectId = process.env.FB_PROJECT_ID;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  // La clave privada a menudo viene con secuencias de escape '\\n'.
  // Es crucial reemplazarlas por saltos de línea reales ('\n').
  const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Las variables de entorno de Firebase Admin no están configuradas. Asegúrate de que FB_PROJECT_ID, FB_CLIENT_EMAIL, y FB_PRIVATE_KEY estén en tu archivo .env'
    );
  }

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
  // Evita reinicializaciones en entornos de desarrollo con hot-reload.
  return getApps().length > 0 ? getApp() : createAdminApp();
}
