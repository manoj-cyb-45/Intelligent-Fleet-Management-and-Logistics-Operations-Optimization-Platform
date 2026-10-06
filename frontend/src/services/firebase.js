import { initializeApp } from "firebase/app";
import {
  getMessaging,
  getToken,
  isSupported,
} from "firebase/messaging";

import api from "./api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export async function registerFirebaseToken() {
  try {
    const supported = await isSupported();

    if (!supported) {
      console.log(
        "Firebase Cloud Messaging is not supported."
      );
      return null;
    }

    const permission =
      await Notification.requestPermission();

    if (permission !== "granted") {
      console.log(
        "Notification permission denied."
      );
      return null;
    }

    const messaging = getMessaging(app);

    const token = await getToken(
      messaging,
      {
        vapidKey:
          import.meta.env.VITE_FIREBASE_VAPID_KEY,
      }
    );

    if (!token) {
      console.log(
        "No Firebase device token available."
      );
      return null;
    }

    await api.post(
      "/notifications/device-token",
      null,
      {
        params: {
          token: token,
        },
      }
    );

    console.log(
      "Firebase device token registered successfully."
    );

    return token;
  } catch (error) {
    console.error(
      "Firebase token registration failed:",
      error
    );

    return null;
  }
}