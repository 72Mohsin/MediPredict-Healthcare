import asyncio
import httpx
import re
import json
from config import settings

OLLAMA_API = f"{settings.OLLAMA_BASE_URL}/api/chat"
ollama_lock = asyncio.Lock()

# ── Minimal system prompt — shorter = faster on low VRAM ─────────────────────
# GTX 1650 has 4GB VRAM. 7B model needs ~4.4GB. Only 14/29 layers go to GPU.
# Every token in the system prompt costs inference time on CPU layers.
# Keep it under 80 tokens.
CHAT_SYSTEM_PROMPT = """You are MediBot, a medical AI assistant. Rules:
- Reply in 2-4 SHORT sentences only
- Ask ONE follow-up question maximum
- Use "may suggest" / "could indicate" language
- For chest pain, stroke, or loss of consciousness: tell user to call emergency services
- Always add: "Consult a real doctor for diagnosis." """

PREDICTION_SYSTEM_PROMPT = 'Respond ONLY with valid JSON, no markdown. Format: {"primary_assessment":"","confidence":70,"reasoning":"","differential_diagnoses":[],"red_flags":[],"follow_up_questions":[""],"recommended_specialist":"","urgency":"routine","home_management":[]}'

# ── Helpers ───────────────────────────────────────────────────────────────────
def _strip_think(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()

def _build_messages(messages, user_symptoms=None, past_predictions=None, medical_profile=None):
    system_msgs = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    # Compact context — one short line max
    ctx_parts = []
    if user_symptoms:
        ctx_parts.append(f"Symptoms: {', '.join(user_symptoms[:5])}")
    if medical_profile:
        age = medical_profile.get("age")
        gender = medical_profile.get("gender")
        if age or gender:
            ctx_parts.append(f"Patient: {age or '?'}y {gender or ''}")
    if past_predictions:
        last = past_predictions[0]
        diseases = [d["disease_name"] for d in last.get("predicted_diseases", [])][:2]
        if diseases:
            ctx_parts.append(f"Last prediction: {', '.join(diseases)}")

    if ctx_parts:
        system_msgs.append({"role": "system", "content": " | ".join(ctx_parts)})

    # Only keep last 4 messages to avoid context overflow on 2048 window
    recent_messages = messages[-4:] if len(messages) > 4 else messages
    return system_msgs + recent_messages


# ── Streaming chat ────────────────────────────────────────────────────────────
async def stream_chat_with_ollama(messages, user_symptoms=None, past_predictions=None, medical_profile=None):
   async with ollama_lock:
    """Async generator yielding text chunks. Filters <think> blocks on the fly."""
    full_messages = _build_messages(messages, user_symptoms, past_predictions, medical_profile)

    buffer = ""
    in_think = False

    async with httpx.AsyncClient(timeout=180.0) as client:
        async with client.stream(
            "POST", OLLAMA_API,
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": full_messages,
                "stream": True,
                "options": {
                    "temperature": 0.5,
                    "top_p": 0.85,
                    "num_predict": 600,      # hard cap — short answers
                    "num_ctx": 2048,         # small context = less CPU memory = faster
                    "repeat_penalty": 1.1,
                          # stop at triple newline to avoid rambling
                },
            },
        ) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except Exception:
                    continue

                token = chunk.get("message", {}).get("content", "")
                if not token:
                    continue

                # Filter <think>…</think> at stream time
                buffer += token
                while True:
                    if in_think:
                        end = buffer.find("</think>")
                        if end == -1:
                            buffer = ""
                            break
                        buffer = buffer[end + 8:]
                        in_think = False
                    else:
                        start = buffer.find("<think>")
                        if start == -1:
                            yield buffer
                            buffer = ""
                            break
                        if start > 0:
                            yield buffer[:start]
                        buffer = buffer[start + 7:]
                        in_think = True

                if chunk.get("done"):
                    if buffer and not in_think:
                        yield buffer
                    elif buffer and in_think:
                        # Model ended mid-think — strip incomplete think and yield whatever is after
                        cleaned = re.sub(r"<think>.*", "", buffer, flags=re.DOTALL).strip()
                        if cleaned:
                            yield cleaned
                    break


# ── Non-streaming fallback ────────────────────────────────────────────────────
async def chat_with_ollama(messages, user_symptoms=None, past_predictions=None, medical_profile=None):
    full_text = ""
    async for chunk in stream_chat_with_ollama(messages, user_symptoms, past_predictions, medical_profile):
        full_text += chunk
    return full_text.strip()


# ── Prediction enrichment ─────────────────────────────────────────────────────
async def get_ollama_prediction(symptoms: list, medical_profile: dict = None) -> dict:
   async with ollama_lock:
    """Structured JSON enrichment of the ML prediction. Skipped if model is slow."""
    profile_ctx = ""
    if medical_profile:
        parts = []
        if medical_profile.get("age"):    parts.append(f"Age:{medical_profile['age']}")
        if medical_profile.get("gender"): parts.append(f"Gender:{medical_profile['gender']}")
        if parts: profile_ctx = " " + " ".join(parts)

    prompt = f"Symptoms:{', '.join(symptoms[:8])}.{profile_ctx} JSON only."

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            OLLAMA_API,
            json={
                "model": settings.OLLAMA_MODEL,
                "messages": [
                    {"role": "system", "content": PREDICTION_SYSTEM_PROMPT},
                    {"role": "user",   "content": prompt},
                ],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 400,
                    "num_ctx": 1024,
                },
            },
        )
        response.raise_for_status()
        content = _strip_think(response.json()["message"]["content"])
        content = re.sub(r"```json\s*|```\s*", "", content).strip()
        try:
            return json.loads(content)
        except Exception:
            match = re.search(r'\{.*\}', content, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
        return None


# ── Health check ──────────────────────────────────────────────────────────────
async def check_ollama_health() -> bool:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                models = [m["name"] for m in resp.json().get("models", [])]
                model_base = settings.OLLAMA_MODEL.split(":")[0]
                return any(model_base in m for m in models)
    except Exception:
        pass
    return False
