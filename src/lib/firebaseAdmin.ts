
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { serviceAccount } from './firebase-admin-config';

// This is the robust way to initialize the admin app, especially for deployment.
// It directly uses the imported service account object, bypassing environment variables.
export const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount as any),
    });
