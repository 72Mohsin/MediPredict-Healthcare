# MediPredict — AI-Powered Medical Health Prediction Platform

A full-stack web application that predicts diseases from symptoms using a trained Machine Learning model, with a real-time AI chatbot (MediBot) powered by DeepSeek-R1 via Ollama, admin panel, nearby doctor search, and complete prediction history.

---

## 🗂️ Project Structure

```
medipredict-final/
├── backend/
│   ├── main.py                ← All API routes + SSE streaming endpoint
│   ├── auth.py                ← JWT authentication + bcrypt
│   ├── database.py            ← MySQL connection pool
│   ├── prediction_engine.py   ← ML model inference (VotingClassifier)
│   ├── ollama_service.py      ← DeepSeek-R1 streaming integration
│   ├── config.py              ← App settings
│   ├── models.py              ← Pydantic request models
│   ├── schema.sql             ← MySQL database schema
│   ├── model.pkl              ← Trained ML model (add manually — see below)
│   ├── label_encoder.pkl      ← Disease label encoder (add manually)
│   ├── symptom_list.pkl       ← 171 symptoms list (add manually)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── AIChatPanel.tsx     ← MediBot streaming chat UI
    │   │   └── NearbyDoctors.tsx   ← Doctor search (Google/Practo/JustDial)
    │   ├── pages/
    │   │   ├── Dashboard.tsx       ← Risk trend chart + stats
    │   │   ├── PredictionForm.tsx  ← Symptom selector (171 symptoms)
    │   │   ├── PredictionResults.tsx ← Charts + results + MediBot
    │   │   ├── AdminPage.tsx       ← User management (admin only)
    │   │   ├── PredictionHistory.tsx
    │   │   ├── ChatPage.tsx        ← Standalone MediBot chat
    │   │   └── MedicalProfilePage.tsx
    │   ├── contexts/AuthContext.tsx
    │   └── lib/api.ts
    └── .env.example
```

---

## ✨ Features

- **ML Prediction** — VotingClassifier (Random Forest + Gradient Boosting) trained on 171 symptoms across 42 diseases
- **Real-time AI Chat** — MediBot powered by DeepSeek-R1 via Ollama, streams responses token by token with full prediction context
- **Visual Results** — Horizontal bar chart for disease probabilities, radial confidence gauge, color-coded risk banner
- **Recommendations** — Recommended tests, specialist doctors, home remedies, immediate actions per prediction
- **Nearby Doctors** — Specialist info + one-click Google, Practo, JustDial search links with city filter
- **Admin Panel** — Manage all users, view platform stats, promote/demote/delete accounts
- **Prediction History** — Full history with risk trend chart on dashboard
- **Medical Profile** — Store age, gender, BMI, lifestyle, existing conditions
- **100% Offline** — ML predictions and AI chat work without internet (Ollama runs locally)
- **Dark / Light Mode** — Full theme support across all pages

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Charts | Recharts (bar chart, radial gauge, line chart) |
| Backend | Python 3.10+, FastAPI, SSE Streaming |
| Authentication | JWT tokens, bcrypt password hashing |
| ML Model | scikit-learn VotingClassifier (Random Forest + Gradient Boosting) |
| AI Chat | Ollama + DeepSeek-R1 (local LLM, no cloud) |
| Database | MySQL 8.0 |

---

## ⚙️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Python | 3.10+ | python.org |
| Node.js | 18+ | nodejs.org |
| MySQL | 8.0+ | mysql.com |
| Ollama | latest | ollama.com |

---

## 🚀 Setup

### Step 1 — Start Ollama

```bash
# Pull the model (downloads once)
ollama pull deepseek-r1:latest

# Start Ollama (keep this terminal open)
ollama serve
```

> You can also use `deepseek-r1:1.5b` (1.1 GB, faster) instead of `latest` (4.7 GB, more accurate).  
> Update `OLLAMA_MODEL` in your `.env` to match whichever you use.

---

### Step 2 — Set Up MySQL

```bash
mysql -u root -p
CREATE DATABASE medipredict CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

---

### Step 3 — Configure and Start the Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password_here
MYSQL_DATABASE=medipredict

JWT_SECRET=any_long_random_string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:latest

FRONTEND_URL=http://localhost:5173
```

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
mysql -u root -p medipredict < schema.sql
python main.py
```

✅ Backend: `http://localhost:8000`  
📚 API Docs: `http://localhost:8000/docs`

---

### Step 4 — Add ML Model Files

The `.pkl` files are not included in this repository (86 MB total).  
Download them and place them inside the `backend/` folder:

- `model.pkl`
- `label_encoder.pkl`
- `symptom_list.pkl`

> The backend will print `✓ ML model loaded: 42 diseases, 171 symptoms` on startup when files are found correctly.

---

### Step 5 — Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend: `http://localhost:5173`

---

## 🧪 First Run

1. Open `http://localhost:5173`
2. Register a new account
3. Go to **New Prediction** → search and select symptoms → click **Generate Prediction**
4. Results page shows disease probabilities, charts, recommendations, and MediBot chat
5. Ask MediBot anything — it already knows your prediction results

---

## 🔑 Make Yourself Admin

After registering, run this in MySQL:

```sql
USE medipredict;
UPDATE users SET role = 'admin' WHERE username = 'your_username';
```

Then log out and back in. You will see the **Admin Panel** link in the navbar.

---

## 🗄️ Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Accounts with bcrypt hashed passwords and role |
| `medical_profiles` | Age, gender, BMI, lifestyle, existing conditions |
| `predictions` | All symptom inputs and ML results |
| `recommendations` | Tests, doctors, home remedies per prediction |
| `chat_sessions` | MediBot conversation threads |
| `chat_messages` | All messages (persisted to MySQL) |

---

## 🔑 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Login → JWT token |
| GET | `/auth/me` | Current user info |
| GET/PUT | `/profile` | Medical profile |
| POST | `/predictions` | Run ML prediction |
| GET | `/predictions` | List all predictions |
| GET | `/predictions/:id` | Get prediction + recommendations |
| GET | `/chat/stream` | SSE streaming MediBot chat |
| GET | `/chat/sessions` | List chat sessions |
| GET | `/admin/users` | All users (admin only) |
| PUT | `/admin/users/:id/role` | Change user role (admin only) |
| DELETE | `/admin/users/:id` | Delete user (admin only) |
| GET | `/admin/stats` | Platform statistics (admin only) |
| GET | `/symptoms` | All 171 symptoms |
| GET | `/health` | Backend + Ollama status |

---

## 🛠️ Troubleshooting

**ML model not loading:**
```
Make sure model.pkl, label_encoder.pkl, symptom_list.pkl are in the backend/ folder.
The terminal will show which files are found (✓) and which are missing (✗) on startup.
```

**Ollama not responding:**
```bash
curl http://localhost:11434/api/tags
ollama list
ollama serve
```

**Frontend can't connect to backend:**
```bash
curl http://localhost:8000/health
# Check frontend/.env contains: VITE_API_URL=http://localhost:8000
```

**MediBot very slow:**
```
Use deepseek-r1:1.5b instead of latest in your .env — much faster on low VRAM GPUs.
```

---

## 👤 Project By

**Mohammed Ali Mohsin Afandi**  
BCA Final Year — Osmania University, Hyderabad  
St. Paul's Degree & PG College

---

## ⚠️ Disclaimer

MediPredict is for educational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a licensed healthcare professional.
