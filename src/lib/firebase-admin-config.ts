
/**
 * @fileoverview This file is deprecated for direct credential storage.
 * Firebase Admin credentials are now loaded from environment variables
 * via the central `getAdminApp` function in `src/lib/firebaseAdmin.ts`.
 *
 * This change enhances security by removing hardcoded secrets from the
 * source code and makes configuration more flexible for different environments.
 * 
 * Please configure your credentials in the `.env` file at the root of the project.
 */

// This object is no longer used directly by the application but is kept
// to avoid breaking imports in other files until they are all updated.
// The real configuration is now loaded via `process.env` in `firebaseAdmin.ts`.
export const serviceAccount = {};
