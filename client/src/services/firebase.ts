import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  User,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID?.trim(),
};

const missingFirebaseSettings = Object.entries(firebaseConfig)
  .filter(([, value]) => !value || value === "replace-me" || value?.includes("your-project"))
  .map(([key]) => key);

const app = missingFirebaseSettings.length === 0
  ? initializeApp(firebaseConfig)
  : null;
const firebaseAuth = app ? getAuth(app) : null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const firebaseConfigurationError = firebaseAuth
  ? ""
  : `Missing Firebase configuration: ${missingFirebaseSettings.join(", ")}`;

export function watchAuth(callback: (user: User | null) => void) {
  if (!firebaseAuth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle() {
  if (!firebaseAuth) {
    throw new Error(firebaseConfigurationError);
  }
  await signInWithPopup(firebaseAuth, provider);
}

export async function signOutUser() {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export async function getIdToken() {
  if (!firebaseAuth?.currentUser) throw new Error("You must sign in before using Recall.");
  return firebaseAuth.currentUser.getIdToken();
}
