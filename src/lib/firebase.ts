
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
