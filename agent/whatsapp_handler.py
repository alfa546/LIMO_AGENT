import os

import requests
from dotenv import load_dotenv

load_dotenv()


def send_whatsapp_message(to_number: str, message: str) -> dict:
    """Send a WhatsApp message using an external WhatsApp gateway API.

    Required env vars:
    - WHATSAPP_API_URL
    - WHATSAPP_API_TOKEN
    """
    api_url = os.getenv("WHATSAPP_API_URL", "").strip()
    api_token = os.getenv("WHATSAPP_API_TOKEN", "").strip()

    if not api_url or not api_token:
        raise RuntimeError("WHATSAPP_API_URL and WHATSAPP_API_TOKEN must be set")

    payload = {
        "to": to_number,
        "message": message,
    }
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json",
    }

    response = requests.post(api_url, json=payload, headers=headers, timeout=20)
    response.raise_for_status()

    try:
        return response.json()
    except Exception:
        return {"status": "ok", "raw": response.text}
