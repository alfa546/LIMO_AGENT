import os
import re
import base64
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from dotenv import load_dotenv

load_dotenv()

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_gmail_service():
    creds = None
    if os.path.exists('token.json'):
        creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
    return build('gmail', 'v1', credentials=creds)


def _extract_urls(text: str):
    pattern = r'https?://[^\s"<]+'
    return re.findall(pattern, text or "")


def get_recent_important_emails(max_results=10):
    service = get_gmail_service()
    query = "newer_than:2d (is:important OR category:primary)"
    results = service.users().messages().list(
        userId='me',
        q=query,
        maxResults=max_results
    ).execute()
    messages = results.get('messages', [])
    email_items = []

    for msg in messages:
        msg_data = service.users().messages().get(
            userId='me',
            id=msg['id'],
            format='full'
        ).execute()
        headers = msg_data['payload']['headers']
        subject = next(
            (h['value'] for h in headers if h['name'] == 'Subject'),
            'No Subject'
        )
        sender = next(
            (h['value'] for h in headers if h['name'] == 'From'),
            'Unknown'
        )
        body = ""
        payload = msg_data['payload']
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    body = base64.urlsafe_b64decode(
                        part['body']['data']
                    ).decode('utf-8')
                    break

        all_text = f"{subject}\n{body}".strip()
        links = _extract_urls(all_text)
        email_items.append({
            'subject': subject,
            'from': sender,
            'snippet': (body[:280] + '...') if len(body) > 280 else body,
            'links': links[:5],
        })

    return email_items


def get_meeting_emails(max_results=10):
    """Backward-compatible alias. Returns important emails, not meeting-only items."""
    return get_recent_important_emails(max_results=max_results)
