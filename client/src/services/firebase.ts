import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  User,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";

const configured = Boolean(
  process.env.REACT_APP_FIREBASE_API_KEY &&
  process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID
);

const app = configured
  ? initializeApp({
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    })
  : null;
const firebaseAuth = app ? getAuth(app) : null;
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

export const firebaseConfigured = configured;

export function watchAuth(callback: (user: User | null) => void) {
  if (!firebaseAuth) {
    callback((localStorage.getItem("recall-demo-auth") === "true" || localStorage.getItem("reverie-demo-auth") === "true") ? ({ uid: "demo", displayName: "Dreamer" } as User) : null);
    return () => undefined;
  }
  getRedirectResult(firebaseAuth).catch(console.error);
  return onAuthStateChanged(firebaseAuth, callback);
}

export async function signInWithGoogle() {
  if (!firebaseAuth) {
    localStorage.setItem("recall-demo-auth", "true");
    return;
  }
  const prefersRedirect = window.matchMedia("(max-width: 700px)").matches;
  if (prefersRedirect) return signInWithRedirect(firebaseAuth, provider);
  await signInWithPopup(firebaseAuth, provider);
}

export async function signOutUser() {
  localStorage.removeItem("recall-demo-auth");
  localStorage.removeItem("reverie-demo-auth");
  if (firebaseAuth) await signOut(firebaseAuth);
}

export async function getIdToken() {
  return firebaseAuth?.currentUser?.getIdToken() || "";
}
