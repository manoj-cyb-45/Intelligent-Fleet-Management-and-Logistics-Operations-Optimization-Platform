import os
import smtplib
from email.mime.text import MIMEText

from dotenv import load_dotenv
from app.notifications.firebase_service import send_fcm_notification

load_dotenv()


# ============================================================
# EMAIL NOTIFICATION
# ============================================================

def send_email_notification(
    recipient_email: str,
    title: str,
    message: str,
):
    """
    Send an email notification using SMTP configuration.
    """

    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")

    if not all([smtp_host, smtp_username, smtp_password]):
        print("Email notification skipped: SMTP is not configured.")
        return

    if not recipient_email:
        print("Email notification skipped: recipient email not available.")
        return

    email = MIMEText(message)
    email["Subject"] = title
    email["From"] = smtp_username
    email["To"] = recipient_email

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(email)

        print(f"Email notification sent to {recipient_email}")

    except Exception as e:
        print(f"Email notification failed: {e}")


# ============================================================
# SMS NOTIFICATION
# ============================================================

def send_sms_notification(
    phone_number: str,
    message: str,
):
    """
    Send an SMS notification using Twilio.
    """

    if not phone_number:
        print("SMS notification skipped: phone number not available.")
        return

    twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    twilio_phone_number = os.getenv("TWILIO_PHONE_NUMBER")

    if not all([
        twilio_account_sid,
        twilio_auth_token,
        twilio_phone_number
    ]):
        print("SMS notification skipped: Twilio is not configured.")
        return

    try:
        from twilio.rest import Client

        client = Client(
            twilio_account_sid,
            twilio_auth_token
        )

        client.messages.create(
            body=message,
            from_=twilio_phone_number,
            to=phone_number
        )

        print(f"SMS notification sent to {phone_number}")

    except Exception as e:
        print(f"SMS notification failed: {e}")


# ============================================================
# PUSH NOTIFICATION
# ============================================================

def send_push_notification(
    token: str,
    title: str,
    message: str,
):
    """
    Send a push notification using Firebase Cloud Messaging.
    """

    if not token:
        print("Push notification skipped: device token not available.")
        return

    try:
        send_fcm_notification(
            token=token,
            title=title,
            message=message,
        )

    except Exception as e:
        print(f"Push notification failed: {e}")