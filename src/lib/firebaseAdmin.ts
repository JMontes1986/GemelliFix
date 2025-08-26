
import { cert, getApps, initializeApp, App, Credential } from "firebase-admin/app";

/**
 * Decodes the Base64 encoded service account JSON from environment variables
 * and creates a Firebase credential object. This is the recommended secure way
 * to handle multi-line JSON credentials in serverless environments.
 * @returns {Credential} The Firebase credential object.
 */
function getCredentials(): Credential {
  const b64 = process.env.FIREBASE_ADMIN_B64;
  if (!b64) {
    throw new Error("FIREBASE_ADMIN_B64 environment variable is not defined. Please encode your full service account JSON to Base64 and set it.");
  }

  let json;
  try {
    // Decode the Base64 string to a UTF-8 JSON string, then parse it.
    json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
  } catch (e) {
    throw new Error("Failed to parse FIREBASE_ADMIN_B64. Make sure it is a valid Base64 encoded JSON string.");
  }

  // Basic validation to ensure the decoded object looks like a service account.
  if (!json.private_key || !json.client_email || !json.project_id) {
    throw new Error("The decoded JSON from FIREBASE_ADMIN_B64 is missing required fields (private_key, client_email, project_id).");
  }

  // Create the credential object using the decoded JSON.
  return cert({
    projectId: json.project_id,
    clientEmail: json.client_email,
    privateKey: json.private_key, // The private key is already correctly formatted within the JSON.
  });
}

/**
 * Retrieves the singleton instance of the Firebase Admin App.
 * If it's not already initialized, it will be created using the
 * credentials from the environment variables.
 * @returns {App} The initialized Firebase Admin App.
 */
export function getAdminApp(): App {
  const apps = getApps();
  // If the app is already initialized, return it to prevent re-initialization.
  if (apps.length) {
    return apps[0];
  }
  // Otherwise, initialize it with the decoded credentials.
  return initializeApp({
    credential: getCredentials(),
  });
}
