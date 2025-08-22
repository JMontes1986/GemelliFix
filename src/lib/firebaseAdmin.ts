import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { serviceAccount } from './firebase-admin-config';

// Singleton pattern: Initialize the admin app only if it doesn't already exist.
// This prevents errors during hot-reloading in development.
// This version imports credentials directly from a .ts file, bypassing environment variables.
export const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(serviceAccount as any),
    });
