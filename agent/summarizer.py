import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def summarize_transcript(transcript: str, target_language: str = "auto") -> dict:
    """Transcript se meeting summary nikalo"""
    print("Summarizing transcript...")

    normalized = (target_language or "auto").strip().lower()
    if normalized not in {"auto", "english", "urdu", "hindi"}:
        normalized = "auto"

    language_rule = """
LANGUAGE RULES - Follow strictly:
- If transcript is in English only -> respond in English
- If transcript is in Urdu only -> respond in Roman Urdu (Urdu written in English letters, NOT Urdu script)
- If transcript is mixed Urdu/English -> respond in Roman Urdu
- NEVER use Urdu script characters
- NEVER use Arabic script
- Roman Urdu example: "Is meeting mein discuss hua ke project deadline extend hogi"
"""

    if normalized == "english":
        language_rule = "Respond only in clear English."
    elif normalized == "urdu":
        language_rule = "Respond only in Roman Urdu. Do not use Urdu/Arabic script."
    elif normalized == "hindi":
        language_rule = "Respond only in Hindi written in Devanagari script."

    prompt = f"""
You are a meeting assistant. Analyze this meeting transcript and provide a summary.

{language_rule}

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
        "transcript": transcript,
        "language": normalized
    }