from pydantic import BaseModel
from typing import Optional

# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

# ── Medical Profile ───────────────────────────────────
class MedicalProfileRequest(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    existing_diseases: Optional[list[str]] = []
    family_history: Optional[list[str]] = []
    smoking_status: Optional[str] = None
    alcohol_consumption: Optional[str] = None
    exercise_habits: Optional[str] = None
    sleep_pattern: Optional[str] = None

# ── Predictions ───────────────────────────────────────
class VitalsRequest(BaseModel):
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    blood_sugar: Optional[float] = None
    cholesterol: Optional[float] = None
    heart_rate: Optional[float] = None
    temperature: Optional[float] = None

class SymptomEntry(BaseModel):
    name: str
    severity: str

class PredictionRequest(BaseModel):
    symptoms: list[SymptomEntry]
    vitals: Optional[VitalsRequest] = None

# ── Chat ──────────────────────────────────────────────
class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    prediction_id: Optional[str] = None
    symptoms: Optional[list[str]] = None  # currently selected symptoms
