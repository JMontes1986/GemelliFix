
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// This is a public configuration and is safe to be exposed.
const firebaseConfig = {
  "projectId": "gemellifix",
  "appId": "1:431414897003:web:12ca75d6bd98572a50c42e",
  "storageBucket": "gemellifix.appspot.com",
  "apiKey": "AIzaSyD-L4zCQfaMSuPAEL0SxisLXujSiKBJBJE",
  "authDomain": "gemellifix.firebaseapp.com",
  "messagingSenderId": "431414897003"
};

// =================================================================
// ========= REGLAS DE SEGURIDAD DE FIRESTORE (COPIAR Y PEGAR) =========
// =================================================================
/*
  Para que la aplicación funcione correctamente, debes actualizar las reglas 
  de seguridad de tu base de datos de Firestore en la Consola de Firebase.

  1. Ve a tu proyecto en https://console.firebase.google.com/
  2. En el menú de la izquierda, ve a Compilación -> Firestore Database.
  3. Haz clic en la pestaña "Reglas".
  4. Reemplaza TODO el contenido con las siguientes reglas y haz clic en "Publicar".

  rules_version = '2';

  service cloud.firestore {
    match /databases/{database}/documents {

      // Los usuarios autenticados pueden leer y escribir sus propios datos de perfil
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      // Los usuarios autenticados pueden leer y crear tickets.
      // Solo el creador o un admin pueden actualizar o borrar.
      // (Esta es una regla básica, se puede refinar más adelante).
      match /tickets/{ticketId} {
         allow read, create: if request.auth != null;
         allow update, delete: if request.auth != null; // Simplificado para desarrollo inicial
      }

      // Los usuarios autenticados pueden crear logs de diagnóstico
      match /diagnosis_logs/{logId} {
         allow create: if request.auth != null;
      }

    }
  }
*/
// =================================================================


// Initialize Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}


const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
