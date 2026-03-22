#!/bin/bash

echo "======================================"
echo "Marine Data Platform - Quick Setup"
echo "======================================"

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not installed. Aborting." >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Python 3 is required but not installed. Aborting." >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "PostgreSQL is required but not installed. Aborting." >&2; exit 1; }

echo "✓ Prerequisites check passed"

# Setup Backend
echo ""
echo "Setting up Backend..."
cd backend

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file. Please update with your database credentials."
fi

npm install
echo "✓ Backend dependencies installed"

# Setup Frontend
echo ""
echo "Setting up Frontend..."
cd ../frontend

if [ ! -f .env ]; then
    cp .env.example .env
fi

npm install
echo "✓ Frontend dependencies installed"

# Setup ML Service
echo ""
echo "Setting up ML Service..."
cd ../ml-service

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
mkdir -p models/saved
echo "✓ ML Service dependencies installed"

deactivate

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Create PostgreSQL database: createdb marine_data"
echo "2. Run database schema: psql -d marine_data -f backend/src/db/schema.sql"
echo "3. Seed data: cd backend && npm run seed"
echo "4. Start services:"
echo "   - Backend: cd backend && npm run dev"
echo "   - Frontend: cd frontend && npm run dev"
echo "   - ML Service: cd ml-service && source venv/bin/activate && python main.py"
echo ""
echo "Access the app at: http://localhost:3000"
