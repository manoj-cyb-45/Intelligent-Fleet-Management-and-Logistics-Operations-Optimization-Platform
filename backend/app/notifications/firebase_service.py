import os
import firebase_admin
from firebase_admin import credentials, messaging
from dotenv import load_dotenv

load_dotenv()


def initialize_firebase():
    if firebase_admin._apps:
        return

    credentials_path = os.getenv("FIREBASE_CREDENTIALS")

    if not credentials_path:
        print("Firebase skipped: credentials path not configured.")
        return

    try:
        cred = credentials.Certificate(credentials_path)
        firebase_admin.initialize_app(cred)
        print("Firebase Admin initialized.")
    except Exception as e:
        print(f"Firebase initialization failed: {e}")


def send_fcm_notification(
    token: str,
    title: str,
    message: str,
):
    if not token:
        return

    try:
        initialize_firebase()

        if not firebase_admin._apps:
            return

        notification = messaging.Notification(
            title=title,
            body=message,
        )

        fcm_message = messaging.Message(
            notification=notification,
            token=token,
        )

        messaging.send(fcm_message)

        print("Push notification sent successfully.")

    except Exception as e:
        print(f"Push notification failed: {e}")