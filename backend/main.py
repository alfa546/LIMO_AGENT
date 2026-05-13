import os
import json
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Setup CORS to allow frontend connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings"

@app.post("/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    model = data.get("model", "inclusionai/ring-2.6-1t:free")
    messages = data.get("messages", [])
    stream = data.get("stream", True)
    modalities = data.get("modalities", None)
    image_config = data.get("image_config", None)

    # Ensure API key is set
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_api_key_here":
        error_json = {"error": "OpenRouter API Key not configured in .env file"}
        if stream:
            async def mock_error():
                yield "data: " + json.dumps(error_json) + "\n\n"
            return StreamingResponse(mock_error(), media_type="text/event-stream")
        else:
            return error_json

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LIMO AI",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": stream
    }
    
    if modalities:
        payload["modalities"] = modalities
    if image_config:
        payload["image_config"] = image_config

    if stream:
        async def stream_generator():
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", OPENROUTER_URL, headers=headers, json=payload) as response:
                    if response.status_code != 200:
                        error_msg = await response.aread()
                        yield "data: " + json.dumps({"error": f"API Error {response.status_code}: {error_msg.decode('utf-8')}"}) + "\n\n"
                        return

                    async for chunk in response.aiter_lines():
                        if chunk:
                            # Forward SSE lines
                            yield f"{chunk}\n\n"
        
        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        # Non-streaming request (for images/embeddings via chat)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(OPENROUTER_URL, headers=headers, json=payload)
            return response.json()


@app.post("/embed")
async def embed_endpoint(request: Request):
    data = await request.json()
    model = data.get("model", "nvidia/llama-nemotron-embed-vl-1b-v2:free")
    text_input = data.get("text", "")
    image_url = data.get("image_url", "")

    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_api_key_here":
        return {"error": "OpenRouter API Key not configured in .env file"}

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LIMO AI",
        "Content-Type": "application/json"
    }

    content_array = [{"type": "text", "text": text_input}]
    if image_url:
        content_array.append({"type": "image_url", "image_url": {"url": image_url}})

    payload = {
        "model": model,
        "input": [{"content": content_array}],
        "encoding_format": "float"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(OPENROUTER_EMBED_URL, headers=headers, json=payload)
        if response.status_code != 200:
            return {"error": f"API Error {response.status_code}: {response.text}"}
        
        return response.json()

@app.post("/video")
async def video_endpoint(request: Request):
    data = await request.json()
    model = data.get("model", "google/veo-3.1-lite")
    prompt = data.get("prompt", "")

    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_api_key_here":
        return {"error": "OpenRouter API Key not configured in .env file"}

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "LIMO AI",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "prompt": prompt
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post("https://openrouter.ai/api/v1/videos", headers=headers, json=payload)
        if response.status_code != 200:
            return {"error": f"API Error {response.status_code}: {response.text}"}
        
        return response.json()

@app.get("/video/status")
async def video_status_endpoint(polling_url: str):
    if not OPENROUTER_API_KEY or OPENROUTER_API_KEY == "your_api_key_here":
        return {"error": "OpenRouter API Key not configured in .env file"}

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}"
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.get(polling_url, headers=headers)
        if response.status_code != 200:
            return {"error": f"API Error {response.status_code}: {response.text}"}
        
        return response.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
