import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBiLbj-eYfWPIYQej6WWfQE19_w86PylGM",
  authDomain: "wingmann-a69b9.firebaseapp.com",
  projectId: "wingmann-a69b9",
  storageBucket: "wingmann-a69b9.firebasestorage.app",
  messagingSenderId: "277565824013",
  appId: "1:277565824013:web:16d92cbcb815d276178944"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);