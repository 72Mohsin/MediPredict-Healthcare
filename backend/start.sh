#!/bin/bash
# MediPredict Backend Startup Script

echo "🚀 Starting MediPredict Backend..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env with your MySQL credentials before continuing"
    exit 1
fi

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt -q

# Check MySQL connection
echo "🔍 Checking database..."
python3 -c "
from config import settings
import mysql.connector
try:
    conn = mysql.connector.connect(
        host=settings.MYSQL_HOST,
        port=settings.MYSQL_PORT,
        user=settings.MYSQL_USER,
        password=settings.MYSQL_PASSWORD,
    )
    print('✅ MySQL connection OK')
    conn.close()
except Exception as e:
    print(f'❌ MySQL connection failed: {e}')
    print('   Check your .env file and make sure MySQL is running')
    exit(1)
"

# Run schema if needed
echo "📋 Setting up database schema..."
python3 -c "
from config import settings
import mysql.connector
conn = mysql.connector.connect(
    host=settings.MYSQL_HOST,
    port=settings.MYSQL_PORT,
    user=settings.MYSQL_USER,
    password=settings.MYSQL_PASSWORD,
)
cursor = conn.cursor()
with open('schema.sql') as f:
    for statement in f.read().split(';'):
        stmt = statement.strip()
        if stmt:
            try:
                cursor.execute(stmt)
            except Exception:
                pass
conn.commit()
cursor.close()
conn.close()
print('✅ Database schema ready')
"

# Check Ollama
echo "🤖 Checking Ollama..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
else
    echo "⚠️  Ollama is not running. Start it with:"
    echo "   ollama run deepseek-r1"
    echo "   (Backend will still start, but AI chat won't work until Ollama is running)"
fi

# Start FastAPI
echo ""
echo "🌐 Starting FastAPI server on http://localhost:8000"
echo "📚 API docs: http://localhost:8000/docs"
echo ""
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
