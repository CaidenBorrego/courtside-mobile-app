import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

// Firebase configuration for development
const firebaseConfigDev = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_DEV || "your-dev-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_DEV || "your-dev-project.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_DEV || "your-dev-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_DEV || "your-dev-project.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_DEV || "123456789",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_DEV || "1:123456789:web:abcdef123456",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID_DEV || "G-ABCDEF123456"
};

// Firebase configuration for production
const firebaseConfigProd = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY_PROD || "your-prod-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN_PROD || "your-prod-project.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID_PROD || "your-prod-project-id",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET_PROD || "your-prod-project.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_PROD || "987654321",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_PROD || "1:987654321:web:fedcba654321",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID_PROD || "G-FEDCBA654321"
};

// Determine which config to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development' || __DEV__;
const firebaseConfig = isDevelopment ? firebaseConfigDev : firebaseConfigProd;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth: Auth = getAuth(app);

export { auth };
export const db = getFirestore(app);

// Initialize Firebase Cloud Messaging (only for web)
let messaging: any = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
    }
  });
}

export { messaging };
export default app;