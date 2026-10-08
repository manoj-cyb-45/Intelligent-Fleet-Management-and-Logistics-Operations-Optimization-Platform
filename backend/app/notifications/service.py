import html
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()


# ============================================================
# EMAIL NOTIFICATION
# ============================================================

def send_email_notification(
    recipient_email: str,
    title: str,
    message: str,
):
    """Send a professional HTML email notification using SMTP."""

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

    safe_title = html.escape(title or "FleetFlow Notification")
    safe_message = html.escape(message or "").replace("\n", "<br>")

    plain_text = (
        f"{title or 'FleetFlow Notification'}\n\n"
        f"{message or ''}\n\n"
        "FleetFlow Intelligent Fleet Management\n"
        "This is an automated notification. Please do not reply to this email."
    )

    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{safe_title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
                    <tr>
                        <td style="background:#0f172a;padding:22px 28px;">
                            <div style="font-size:22px;font-weight:700;color:#ffffff;">FleetFlow</div>
                            <div style="font-size:13px;color:#cbd5e1;margin-top:4px;">Intelligent Fleet Management</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 28px 20px;">
                            <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">Notification</div>
                            <h1 style="margin:0;font-size:24px;line-height:1.3;color:#111827;">{safe_title}</h1>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:0 28px 30px;">
                            <div style="font-size:16px;line-height:1.7;color:#374151;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:20px;">
                                {safe_message}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:18px 28px;border-top:1px solid #e5e7eb;background:#fafafa;">
                            <div style="font-size:12px;line-height:1.6;color:#64748b;">
                                This is an automated notification from FleetFlow. Please do not reply to this email.
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""

    email = MIMEMultipart("alternative")
    email["Subject"] = title
    email["From"] = smtp_username
    email["To"] = recipient_email
    email.attach(MIMEText(plain_text, "plain", "utf-8"))
    email.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(email)

        print(f"Email notification sent to {recipient_email}")

    except Exception as e:
        print(f"Email notification failed: {e}")
