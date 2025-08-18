// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectStorageEmulator } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  projectId: "gemellifix",
  appId: "1:431414897003:web:12ca75d6bd98572a50c42e",
  storageBucket: "gemellifix.appspot.com",
  apiKey: "AIzaSyD-L4zCQfaMSuPAEL0SxisLXujSiKBJBJE",
  authDomain: "gemellifix.firebaseapp.com",
  messagingSenderId: "431414897003",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

if (process.env.NODE_ENV === 'development') {
    //connectAuthEmulator(auth, 'http://127.0.0.1:9099');
    //connectFirestoreEmulator(db, '127.0.0.1', 8080);
    //connectStorageEmulator(storage, '127.0.0.1', 9199);
}


export { app, auth, db, storage };
