
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { serviceAccount } from '@/lib/firebase-admin-config';

let adminApp: App;

if (!getApps().length) {
  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  adminApp = getApp();
}

export { adminApp };
