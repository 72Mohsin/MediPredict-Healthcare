import json
import re
import asyncio
from datetime import datetime
from typing import AsyncGenerator
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from config import settings
from database import DB, gen_id
from auth import hash_password, verify_password, create_token, get_current_user
from models import RegisterRequest, LoginRequest, MedicalProfileRequest, PredictionRequest, ChatRequest
from prediction_engine import generate_prediction, get_all_symptoms
from ollama_service import chat_with_ollama, stream_chat_with_ollama, get_ollama_prediction, check_ollama_health

app = FastAPI(title="MediPredict API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)

# ── Startup: pre-load ML model ───────────────────────
@app.on_event("startup")
async def startup_event():
    from prediction_engine import _load_model
    import asyncio
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _load_model)
    print("✓ ML model pre-loaded on startup")

# ── Health ────────────────────────────────────────────
@app.get("/health")
async def health():
    ollama_ok = await check_ollama_health()
    return {"status": "ok", "ollama": "online" if ollama_ok else "offline", "model": settings.OLLAMA_MODEL}

# ── Symptoms list ─────────────────────────────────────
@app.get("/symptoms")
async def symptoms():
    return {"symptoms": get_all_symptoms()}

# ── Auth ──────────────────────────────────────────────
@app.post("/auth/register")
async def register(req: RegisterRequest):
    if not re.match(r"^[a-zA-Z0-9_]+$", req.username):
        raise HTTPException(400, "Username can only contain letters, numbers, and underscores")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if DB.fetch_one("SELECT id FROM users WHERE username = %s", (req.username,)):
        raise HTTPException(400, "Username already taken")
    user_id = gen_id()
    DB.insert("INSERT INTO users (id, username, password_hash) VALUES (%s, %s, %s)",
              (user_id, req.username, hash_password(req.password)))
    token = create_token(user_id, req.username, "user")
    return {"token": token, "user": {"id": user_id, "username": req.username, "role": "user"}}

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = DB.fetch_one("SELECT * FROM users WHERE username = %s", (req.username,))
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password")
    token = create_token(user["id"], user["username"], user["role"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "role": user["role"]}}

@app.get("/auth/me")
async def me(current_user: dict = Depends(get_current_user)):
    return current_user

# ── Medical Profile ───────────────────────────────────
@app.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = DB.fetch_one("SELECT * FROM medical_profiles WHERE user_id = %s", (current_user["id"],))
    if not profile:
        return None
    for field in ["existing_diseases", "family_history"]:
        if isinstance(profile.get(field), str):
            profile[field] = json.loads(profile[field])
    return profile

@app.put("/profile")
async def save_profile(req: MedicalProfileRequest, current_user: dict = Depends(get_current_user)):
    existing = DB.fetch_one("SELECT id FROM medical_profiles WHERE user_id = %s", (current_user["id"],))
    data = req.model_dump()
    data["existing_diseases"] = json.dumps(data.get("existing_diseases") or [])
    data["family_history"] = json.dumps(data.get("family_history") or [])
    if existing:
        DB.execute("""UPDATE medical_profiles SET age=%s,gender=%s,height=%s,weight=%s,bmi=%s,
                   existing_diseases=%s,family_history=%s,smoking_status=%s,
                   alcohol_consumption=%s,exercise_habits=%s,sleep_pattern=%s WHERE user_id=%s""",
                   (data["age"],data["gender"],data["height"],data["weight"],data["bmi"],
                    data["existing_diseases"],data["family_history"],data["smoking_status"],
                    data["alcohol_consumption"],data["exercise_habits"],data["sleep_pattern"],current_user["id"]))
    else:
        DB.insert("""INSERT INTO medical_profiles
                   (id,user_id,age,gender,height,weight,bmi,existing_diseases,
                   family_history,smoking_status,alcohol_consumption,exercise_habits,sleep_pattern)
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
                  (gen_id(),current_user["id"],data["age"],data["gender"],data["height"],data["weight"],data["bmi"],
                   data["existing_diseases"],data["family_history"],data["smoking_status"],
                   data["alcohol_consumption"],data["exercise_habits"],data["sleep_pattern"]))
    return {"message": "Profile saved"}

# ── Predictions ───────────────────────────────────────
@app.post("/predictions")
async def create_prediction(req: PredictionRequest, current_user: dict = Depends(get_current_user)):
    symptoms_list = [{"name": s.name, "severity": s.severity} for s in req.symptoms]
    vitals_dict = req.vitals.model_dump() if req.vitals else None

    # 1. ML model prediction
    ml_result = generate_prediction(symptoms_list, vitals_dict)

    # 2. Ollama AI enrichment — skip for predictions to keep response fast.
    # The 7B model on GTX 1650 takes 60-120s for structured JSON.
    # MediBot chat still uses Ollama in real-time via streaming.
    ollama_insight = None
    # Uncomment below ONLY if you have a GPU with 8GB+ VRAM:
    # try:
    #     import asyncio
    #     ollama_ok = await check_ollama_health()
    #     if ollama_ok:
    #         symptom_names = [s["name"] for s in symptoms_list]
    #         ollama_insight = await asyncio.wait_for(
    #             get_ollama_prediction(symptom_names, None), timeout=15.0
    #         )
    # except Exception as e:
    #     print(f"Ollama prediction enrichment skipped: {e}")

    # Merge Ollama insight into ML result
    if ollama_insight:
        ai_reasoning = ollama_insight.get("reasoning", "")
        ai_questions = ollama_insight.get("follow_up_questions", [])
        ai_red_flags = ollama_insight.get("red_flags", [])

        if ai_reasoning:
            ml_result["reasoning"] = (
                f"**ML Analysis:** {ml_result['reasoning']}\n\n"
                f"**AI Clinical Insight:** {ai_reasoning}"
            )
        if ai_red_flags:
            ml_result["actions"] = [f"⚠️ Red flag: {rf}" for rf in ai_red_flags[:2]] + ml_result["actions"]
        if ai_questions:
            ml_result["follow_up_question"] = ai_questions[0]

        # Override urgency if AI says emergency
        if ollama_insight.get("urgency") == "emergency":
            ml_result["risk_level"] = "high"
            ml_result["emergency"] = True
            if not ml_result["emergency_msg"]:
                ml_result["emergency_msg"] = "AI assessment indicates this may require emergency attention. Please seek immediate medical care."

    # Save prediction
    pred_id = gen_id()
    DB.insert("""INSERT INTO predictions
               (id,user_id,symptoms,vitals,predicted_diseases,risk_level,confidence_score,reasoning)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
              (pred_id, current_user["id"],
               json.dumps([f"{s['name']} ({s['severity']})" for s in symptoms_list]),
               json.dumps(vitals_dict) if vitals_dict else None,
               json.dumps(ml_result["diseases"]),
               ml_result["risk_level"], ml_result["confidence"], ml_result["reasoning"]))

    rec_id = gen_id()
    DB.insert("""INSERT INTO recommendations
               (id,prediction_id,recommended_tests,doctor_specialties,immediate_actions,
               home_remedies,emergency_warning,emergency_message)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
              (rec_id, pred_id,
               json.dumps(ml_result["tests"]), json.dumps(ml_result["doctors"]),
               json.dumps(ml_result["actions"]), json.dumps(ml_result["home_remedies"]),
               ml_result["emergency"], ml_result["emergency_msg"]))

    return {
        "id": pred_id,
        "predicted_diseases": ml_result["diseases"],
        "risk_level": ml_result["risk_level"],
        "confidence_score": ml_result["confidence"],
        "reasoning": ml_result["reasoning"],
        "ml_powered": ml_result.get("ml_powered", True),
        "ai_enriched": ollama_insight is not None,
        "follow_up_question": ml_result.get("follow_up_question"),
        "recommendations": {
            "recommended_tests": ml_result["tests"],
            "doctor_specialties": ml_result["doctors"],
            "immediate_actions": ml_result["actions"],
            "home_remedies": ml_result["home_remedies"],
            "emergency_warning": ml_result["emergency"],
            "emergency_message": ml_result["emergency_msg"],
        },
    }

@app.get("/predictions")
async def list_predictions(limit: int = 50, current_user: dict = Depends(get_current_user)):
    rows = DB.fetch_all("SELECT * FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT %s",
                        (current_user["id"], limit))
    for row in rows:
        for field in ["symptoms", "vitals", "predicted_diseases"]:
            if isinstance(row.get(field), str):
                row[field] = json.loads(row[field])
        if isinstance(row.get("created_at"), datetime):
            row["created_at"] = row["created_at"].isoformat()
    return rows

@app.get("/predictions/{prediction_id}")
async def get_prediction(prediction_id: str, current_user: dict = Depends(get_current_user)):
    pred = DB.fetch_one("SELECT * FROM predictions WHERE id = %s AND user_id = %s",
                        (prediction_id, current_user["id"]))
    if not pred:
        raise HTTPException(404, "Prediction not found")
    for field in ["symptoms", "vitals", "predicted_diseases"]:
        if isinstance(pred.get(field), str):
            pred[field] = json.loads(pred[field])
    if isinstance(pred.get("created_at"), datetime):
        pred["created_at"] = pred["created_at"].isoformat()
    rec = DB.fetch_one("SELECT * FROM recommendations WHERE prediction_id = %s", (prediction_id,))
    if rec:
        for field in ["recommended_tests", "doctor_specialties", "immediate_actions", "home_remedies"]:
            if isinstance(rec.get(field), str):
                rec[field] = json.loads(rec[field])
        if isinstance(rec.get("created_at"), datetime):
            rec["created_at"] = rec["created_at"].isoformat()
        pred["recommendations"] = rec
    return pred

# ── Chat ──────────────────────────────────────────────
@app.post("/chat")
async def chat(req: ChatRequest, current_user: dict = Depends(get_current_user)):
    session_id = req.session_id
    if not session_id:
        session_id = gen_id()
        title = f"Chat about {', '.join((req.symptoms or ['health'])[:2])}"
        DB.insert("INSERT INTO chat_sessions (id,user_id,prediction_id,title) VALUES (%s,%s,%s,%s)",
                  (session_id, current_user["id"], req.prediction_id, title[:255]))

    history_rows = DB.fetch_all("SELECT role,content FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC",
                                 (session_id,))
    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

    profile = DB.fetch_one("SELECT * FROM medical_profiles WHERE user_id = %s", (current_user["id"],))
    if profile:
        for field in ["existing_diseases", "family_history"]:
            if isinstance(profile.get(field), str):
                profile[field] = json.loads(profile[field])

    past_preds = DB.fetch_all("SELECT predicted_diseases,risk_level,created_at FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 5",
                               (current_user["id"],))
    for p in past_preds:
        if isinstance(p.get("predicted_diseases"), str):
            p["predicted_diseases"] = json.loads(p["predicted_diseases"])
        if isinstance(p.get("created_at"), datetime):
            p["created_at"] = p["created_at"].isoformat()

    DB.insert("INSERT INTO chat_messages (id,session_id,role,content) VALUES (%s,%s,%s,%s)",
              (gen_id(), session_id, "user", req.message))

    messages = history + [{"role": "user", "content": req.message}]
    try:
        ai_response = await chat_with_ollama(messages=messages, user_symptoms=req.symptoms,
                                              past_predictions=past_preds, medical_profile=profile)
    except Exception as e:
        raise HTTPException(503, f"Ollama error: {str(e)}. Make sure Ollama is running with {settings.OLLAMA_MODEL}.")

    DB.insert("INSERT INTO chat_messages (id,session_id,role,content) VALUES (%s,%s,%s,%s)",
              (gen_id(), session_id, "assistant", ai_response))
    DB.execute("UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s", (session_id,))
    return {"session_id": session_id, "response": ai_response}

@app.get("/chat/stream")
async def chat_stream(
    message: str,
    session_id: str = None,
    prediction_id: str = None,
    symptoms: str = "",
    current_user: dict = Depends(get_current_user),
):
    """Server-Sent Events streaming chat endpoint."""
    symptom_list = [s.strip() for s in symptoms.split(",") if s.strip()] if symptoms else []

    # Handle session
    sid = session_id
    if not sid:
        sid = gen_id()
        title = f"Chat about {', '.join(symptom_list[:2]) or 'health'}"
        DB.insert("INSERT INTO chat_sessions (id,user_id,prediction_id,title) VALUES (%s,%s,%s,%s)",
                  (sid, current_user["id"], prediction_id, title[:255]))

    history_rows = DB.fetch_all(
        "SELECT role,content FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC",
        (sid,)
    )
    history = [{"role": r["role"], "content": r["content"]} for r in history_rows]

    profile = DB.fetch_one("SELECT * FROM medical_profiles WHERE user_id = %s", (current_user["id"],))
    if profile:
        for field in ["existing_diseases", "family_history"]:
            if isinstance(profile.get(field), str):
                profile[field] = json.loads(profile[field])

    past_preds = DB.fetch_all(
        "SELECT predicted_diseases,risk_level,created_at FROM predictions WHERE user_id = %s ORDER BY created_at DESC LIMIT 3",
        (current_user["id"],)
    )
    for p in past_preds:
        if isinstance(p.get("predicted_diseases"), str):
            p["predicted_diseases"] = json.loads(p["predicted_diseases"])
        if isinstance(p.get("created_at"), datetime):
            p["created_at"] = p["created_at"].isoformat()

    DB.insert("INSERT INTO chat_messages (id,session_id,role,content) VALUES (%s,%s,%s,%s)",
              (gen_id(), sid, "user", message))

    messages = history + [{"role": "user", "content": message}]

    async def event_generator() -> AsyncGenerator[str, None]:
        full_response = []
        try:
            # Send session_id first so frontend can capture it
            yield f"data: {json.dumps({'type': 'session', 'session_id': sid})}\n\n"

            async for chunk in stream_chat_with_ollama(
                messages=messages,
                user_symptoms=symptom_list,
                past_predictions=past_preds,
                medical_profile=profile,
            ):
                if chunk:
                    full_response.append(chunk)
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

            # Save full response to DB
            complete = "".join(full_response).strip()
            if complete:
                DB.insert("INSERT INTO chat_messages (id,session_id,role,content) VALUES (%s,%s,%s,%s)",
                          (gen_id(), sid, "assistant", complete))
                DB.execute("UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s", (sid,))

            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*",
        },
    )

@app.get("/chat/sessions")
async def list_sessions(current_user: dict = Depends(get_current_user)):
    rows = DB.fetch_all("SELECT id,title,prediction_id,created_at,updated_at FROM chat_sessions WHERE user_id = %s ORDER BY updated_at DESC LIMIT 20",
                         (current_user["id"],))
    for r in rows:
        for f in ["created_at","updated_at"]:
            if isinstance(r.get(f), datetime):
                r[f] = r[f].isoformat()
    return rows

@app.get("/chat/sessions/{session_id}/messages")
async def get_session_messages(session_id: str, current_user: dict = Depends(get_current_user)):
    session = DB.fetch_one("SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s",
                            (session_id, current_user["id"]))
    if not session:
        raise HTTPException(404, "Session not found")
    rows = DB.fetch_all("SELECT role,content,created_at FROM chat_messages WHERE session_id = %s ORDER BY created_at ASC",
                         (session_id,))
    for r in rows:
        if isinstance(r.get("created_at"), datetime):
            r["created_at"] = r["created_at"].isoformat()
    return rows

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


# ── Admin ─────────────────────────────────────────────
from fastapi import HTTPException, status
from pydantic import BaseModel

def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    return current_user

class RoleUpdateRequest(BaseModel):
    role: str

@app.get("/admin/users")
async def admin_list_users(admin: dict = Depends(require_admin)):
    users = DB.fetch_all("""
        SELECT u.id, u.username, u.role, u.created_at,
               COUNT(p.id) AS prediction_count,
               MAX(p.created_at) AS last_prediction
        FROM users u
        LEFT JOIN predictions p ON p.user_id = u.id
        GROUP BY u.id
        ORDER BY u.created_at DESC
    """)
    for u in users:
        for f in ["created_at", "last_prediction"]:
            if isinstance(u.get(f), datetime):
                u[f] = u[f].isoformat()
    return users

@app.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_users = (DB.fetch_one("SELECT COUNT(*) AS c FROM users") or {}).get("c", 0)
    total_predictions = (DB.fetch_one("SELECT COUNT(*) AS c FROM predictions") or {}).get("c", 0)
    total_chats = (DB.fetch_one("SELECT COUNT(*) AS c FROM chat_sessions") or {}).get("c", 0)
    active_today = (DB.fetch_one(
        "SELECT COUNT(DISTINCT user_id) AS c FROM predictions WHERE DATE(created_at) = CURDATE()"
    ) or {}).get("c", 0)
    return {
        "total_users": total_users,
        "total_predictions": total_predictions,
        "total_chats": total_chats,
        "active_today": active_today,
    }

@app.put("/admin/users/{user_id}/role")
async def admin_update_role(user_id: str, req: RoleUpdateRequest, admin: dict = Depends(require_admin)):
    if req.role not in ("user", "admin"):
        raise HTTPException(400, "Role must be 'user' or 'admin'")
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot change your own role")
    user = DB.fetch_one("SELECT id FROM users WHERE id = %s", (user_id,))
    if not user:
        raise HTTPException(404, "User not found")
    DB.execute("UPDATE users SET role = %s WHERE id = %s", (req.role, user_id))
    return {"message": f"Role updated to {req.role}"}

@app.delete("/admin/users/{user_id}")
async def admin_delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(400, "Cannot delete your own account")
    user = DB.fetch_one("SELECT id FROM users WHERE id = %s", (user_id,))
    if not user:
        raise HTTPException(404, "User not found")
    DB.execute("DELETE FROM users WHERE id = %s", (user_id,))
    return {"message": "User deleted"}
