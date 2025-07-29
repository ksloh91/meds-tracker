import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { useAuthStore } from "~/stores/auth";

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
  };

  const app = initializeApp(firebaseConfig);

  const auth = getAuth(app);
  const firestore = getFirestore(app);
  const authStore = useAuthStore();

  // This is the core of our auth system. It updates the Pinia store
  // whenever the user's authentication state changes.
  onAuthStateChanged(auth, (user) => {
    authStore.setAuth(user);
  });

  nuxtApp.provide('auth', auth);
  nuxtApp.provide('firestore', firestore);
});