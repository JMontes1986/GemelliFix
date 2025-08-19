
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// =================================================================
// ========= DIAGNÓSTICO DEL PROBLEMA DE CONEXIÓN PERSISTENTE =========
// =================================================================
/*
  Si la aplicación se queda "colgada" en "Intentando conectar con Firestore..."
  y nunca muestra un mensaje de éxito o error, las causas más probables son:

  1.  **LA BASE DE DATOS NO ESTÁ CREADA:** Es el motivo más común. Aunque tengas
      un proyecto en Firebase, necesitas inicializar la base de datos.
      - **Solución:** Ve a tu proyecto en la Consola de Firebase, selecciona
        "Firestore Database" en el menú y haz clic en el botón "Crear base de datos".
        Sigue los pasos para crearla (se recomienda el modo de producción).

  2.  **CONFIGURACIÓN INCORRECTA:** El objeto `firebaseConfig` de abajo no coincide
      con el proyecto donde configuraste las reglas de seguridad.
      - **Solución:** Asegúrate de que estás trabajando en el proyecto `gemellifix`
        o reemplaza la configuración de abajo con la de tu propio proyecto, que
        puedes obtener desde la configuración de tu proyecto en la consola de Firebase.

  3.  **REGLAS DE SEGURIDAD:** Las reglas de seguridad de Firestore no permiten
      la operación. Ya hemos intentado solucionarlo, pero asegúrate de que
      estén publicadas correctamente.
*/
// =================================================================


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-L4zCQfaMSuPAEL0SxisLXujSiKBJBJE",
  authDomain: "gemellifix.firebaseapp.com",
  projectId: "gemellifix",
  storageBucket: "gemellifix.firebasestorage.app",
  messagingSenderId: "431414897003",
  appId: "1:431414897003:web:12ca75d6bd98572a50c42e"
};


// Initialize Firebase
// This pattern prevents re-initializing the app on hot-reloads in Next.js
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);


const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
