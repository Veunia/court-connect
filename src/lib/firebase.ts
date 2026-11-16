import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getVertexAI, getGenerativeModel } from "firebase/vertexai";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase only if the config is available to prevent errors if not set up yet
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// Initialize App Check
let appCheck = null;
if (app && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  // Use ReCaptchaEnterpriseProvider as recommended by Firebase AI Logic docs
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}

// Initialize Vertex AI
const vertexAI = app ? getVertexAI(app) : null;

export { app, appCheck, vertexAI, getGenerativeModel };
