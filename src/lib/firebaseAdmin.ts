
// src/lib/firebaseAdmin.ts
import 'dotenv/config'; // Asegura que las variables de entorno se carguen primero
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";

type SaJson = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function readFromBase64(): SaJson | null {
  const b64 = process.env.FIREBASE_ADMIN_B64;
  if (!b64) return null;

  try {
    const jsonStr = Buffer.from(b64, "base64").toString("utf8");
    const parsed = JSON.parse(jsonStr);

    if (!parsed?.private_key || !parsed?.client_email || !parsed?.project_id) {
      throw new Error(
        "El JSON decodificado no tiene {project_id, client_email, private_key}."
      );
    }
    return {
      project_id: parsed.project_id,
      client_email: parsed.client_email,
      private_key: parsed.private_key,
    };
  } catch (e) {
    // Lanza un mensaje claro para debugging
    throw new Error(
      "Failed to parse FIREBASE_ADMIN_B64. Make sure it is a valid Base64 encoded JSON string."
    );
  }
}

function readFromSplitVars(): SaJson | null {
  const projectId = process.env.FB_PROJECT_ID || process.env.GCLOUD_PROJECT;
  const clientEmail = process.env.FB_CLIENT_EMAIL;
  let privateKey = process.env.FB_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  // Corrige los \n escapados si vienen en una sola línea
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  return { project_id: projectId, client_email: clientEmail, private_key: privateKey };
}

function getCredential() {
  const fromB64 = readFromBase64();
  const fromSplit = !fromB64 ? readFromSplitVars() : null;
  const sa = fromB64 ?? fromSplit;

  if (!sa) {
    throw new Error(
      "No se encontraron credenciales Admin. Define FIREBASE_ADMIN_B64 (JSON base64) o FB_PROJECT_ID/FB_CLIENT_EMAIL/FB_PRIVATE_KEY."
    );
  }

  if (!sa.private_key.startsWith("-----BEGIN")) {
    throw new Error(
      "La private_key no tiene formato PEM válido (debe iniciar con '-----BEGIN PRIVATE KEY-----')."
    );
  }

  return cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  });
}

export function getAdminApp(): App {
  const apps = getApps();
  if (apps.length) return apps[0];
  return initializeApp({ credential: getCredential() });
}
