import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def summarize_transcript(transcript: str) -> dict:
    """Transcript se meeting summary nikalo"""
    print("Summarizing transcript...")

    prompt = f"""
You are a meeting assistant. Analyze this meeting transcript and provide a summary.

LANGUAGE RULES - Follow strictly:
- If transcript is in English only -> respond in English
- If transcript is in Urdu only -> respond in Roman Urdu (Urdu written in English letters, NOT Urdu script)
- If transcript is mixed Urdu/English -> respond in Roman Urdu
- NEVER use Urdu script characters
- NEVER use Arabic script
- Roman Urdu example: "Is meeting mein discuss hua ke project deadline extend hogi"

Provide:
1. **Meeting Summary** (3-4 lines)
2. **Key Points** (bullet points)
3. **Action Items** (who needs to do what)
4. **Decisions Made**

Transcript:
{transcript}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=1500
    )

    summary = response.choices[0].message.content
    return {
        "summary": summary,
        "transcript": transcript
    }