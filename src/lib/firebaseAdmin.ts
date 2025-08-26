// src/lib/firebaseAdmin.ts
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

// Esta función ahora es la única fuente de verdad para obtener la app de admin.
// Garantiza que solo se inicialice una vez.
function createAdminApp(): App {
    const projectId = process.env.FB_PROJECT_ID;
    const clientEmail = process.env.FB_CLIENT_EMAIL;
    const privateKey = process.env.FB_PRIVATE_KEY;

    // Validación estricta de las variables de entorno.
    if (!projectId || !clientEmail || !privateKey) {
        throw new Error(
            'Firebase Admin environment variables not set. Ensure FB_PROJECT_ID, FB_CLIENT_EMAIL, and FB_PRIVATE_KEY are correctly configured in your .env file.'
        );
    }
    
    try {
        // Reemplaza los \\n literales por saltos de línea reales.
        // Esto es crucial para que la clave privada sea válida.
        const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
        
        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: formattedPrivateKey
            }),
        });
    } catch (error: any) {
        console.error("Firebase Admin SDK initialization error:", error.message);
        if (error.code === 'app/invalid-credential' || error.message?.includes('PEM')) {
            throw new Error('Failed to parse Firebase private key. Ensure it is correctly formatted in your environment variable.');
        }
        throw error;
    }
}

export function getAdminApp(): App {
  // Si ya hay apps inicializadas, devuelve la primera (la por defecto).
  // Si no, la crea. Esto evita errores de "app ya existe".
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return createAdminApp();
}
