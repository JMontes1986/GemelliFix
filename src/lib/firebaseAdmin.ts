
import { cert, getApps, initializeApp, getApp, App } from 'firebase-admin/app';
import { ServiceAccount } from 'firebase-admin';

// This function decodes the Base64 encoded service account key from environment variables.
// This is the most robust method for handling multi-line JSON credentials in cloud environments.
function getServiceAccount(): ServiceAccount {
    const base64Key = process.env.FB_SERVICE_ACCOUNT_B64;

    if (!base64Key) {
        // This error will be thrown if the environment variable is not set.
        // It provides clear instructions for the developer.
        throw new Error(
            'The FB_SERVICE_ACCOUNT_B64 environment variable is not set. ' +
            'Please encode your service account JSON file to Base64 and set it in your .env file.'
        );
    }
    
    try {
        // Decode the Base64 string to get the original JSON string.
        const decodedKey = Buffer.from(base64Key, 'base64').toString('utf8');
        // Parse the JSON string into an object.
        const serviceAccount = JSON.parse(decodedKey);
        return serviceAccount as ServiceAccount;
    } catch (error: any) {
        console.error("Failed to parse the decoded service account key:", error);
        throw new Error("The FB_SERVICE_ACCOUNT_B64 environment variable is malformed or not a valid Base64 string.");
    }
}


// Singleton pattern: Initialize the admin app only if it doesn't already exist.
// This prevents errors during hot-reloading in development.
export const adminApp: App = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(getServiceAccount()),
    });
