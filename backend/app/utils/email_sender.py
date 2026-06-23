import urllib.request
import json
import traceback
from ..config import Config

def send_email_brevo(to_email, subject, html_content, to_name=None):
    """
    Sends an email using Brevo's HTTPS REST API (v3/smtp/email).
    Avoids SMTP port blocking by using HTTPS port 443.
    """
    api_key = Config.MAIL_PASSWORD  # Brevo SMTP password doubles as API key
    sender_email = Config.MAIL_DEFAULT_SENDER or "clinica.dental.alba@outlook.com"

    if not api_key:
        print("[EMAIL SENDER] Error: Config.MAIL_PASSWORD (Brevo API key) is not set.")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    
    payload = {
        "sender": {
            "name": "Clínica Odontológica Alba",
            "email": sender_email
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or to_email
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }

    try:
        req_data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = response.read().decode('utf-8')
            print(f"[EMAIL SENDER] Email successfully sent to {to_email}. Response: {res_data}")
            return True
    except Exception as e:
        print(f"[EMAIL SENDER] Error sending email to {to_email}: {str(e)}")
        traceback.print_exc()
        return False
