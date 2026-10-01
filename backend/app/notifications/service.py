import os
import smtplib
from email.mime.text import MIMEText


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

    # If SMTP is not configured, don't crash the application.
    if not all([smtp_host, smtp_username, smtp_password]):
        print("Email notification skipped: SMTP is not configured.")
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
    Send an SMS notification.

    Currently implemented as a provider integration point.
    Replace the print statement with the selected SMS
    provider API when provider credentials are available.
    """

    if not phone_number:
        print("SMS notification skipped: phone number not available.")
        return

    print(
        f"SMS notification sent to {phone_number}: {message}"
    )


# ============================================================
# PUSH NOTIFICATION
# ============================================================

def send_push_notification(
    user_id: str,
    title: str,
    message: str,
):
    """
    Send a push notification.

    Currently implemented as a push-service integration point.
    A Firebase/FCM or other push provider can be connected here.
    """

    if not user_id:
        print("Push notification skipped: user ID not available.")
        return

    print(
        f"Push notification sent to {user_id}: "
        f"{title} - {message}"
    )