/**
 * @fileoverview This file contains the service account credentials for Firebase Admin.
 * It is used to authenticate the backend with Firebase services.
 * 
 * IMPORTANT: Replace the placeholder object below with the actual content of your
 * service account JSON file. This file should be treated as a secret and
 * should not be committed to public version control if it contains real credentials.
 */

// TODO: Replace the entire object with your actual service account credentials.
export const serviceAccount = {
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "your-private-key-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_PRIVATE_KEY_CONTENT\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-client-email@your-project-id.iam.gserviceaccount.com",
  "client_id": "your-client-id",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/your-client-email.iam.gserviceaccount.com"
};
