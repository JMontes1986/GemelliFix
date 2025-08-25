
import { initializeApp, getApps, App } from 'firebase-admin/app';

function createAdminApp(): App {
  // Cuando se despliega en Firebase (Functions, App Hosting), el SDK
  // detecta automáticamente las credenciales del entorno.
  // No es necesario pasar `credential` explícitamente.
  return initializeApp();
}

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return createAdminApp();
}
