import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';

// Asegúrate de que tus variables de entorno estén configuradas en tu entorno de hosting (Vercel, etc.)
const projectId = process.env.FB_PROJECT_ID;
const clientEmail = process.env.FB_CLIENT_EMAIL;

// Esta es la corrección clave: Reemplaza los caracteres \\n con saltos de línea reales.
const privateKey = process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
  // En un entorno de servidor, es mejor lanzar un error si las credenciales no están.
  // En desarrollo, esto te alertará inmediatamente si falta algo en tu .env.local
  console.error("Missing Firebase Admin SDK credentials. Check FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY environment variables.");
  // No inicializamos la app si faltan credenciales para evitar errores posteriores.
}

// Patrón Singleton: Inicializa la app de admin solo si no existe ya una.
// Esto previene errores de "app ya inicializada" en entornos de hot-reloading (desarrollo).
export const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
