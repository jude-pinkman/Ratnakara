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
echo "1. Initialize Neon database: python3 init_database.py"
echo "2. Validate schema: python3 schema_validator.py"
echo "3. Start services (use 4 terminals):"
echo "   Terminal 1 - Backend:   cd backend && npm run dev"
echo "   Terminal 2 - Frontend:  cd frontend && npm run dev"
echo "   Terminal 3 - Pipelines: cd marine-pipeline-service && python run_pipeline.py all"
echo "   Terminal 4 - Scheduler: cd marine-pipeline-service && python orchestrator.py"
echo ""
echo "Access the dashboard at: http://localhost:3000"
echo ""
echo "Documentation:"
echo "  • NEON_DATABASE_SETUP.md    - Complete Neon setup guide"
echo "  • PIPELINE_FIELD_MAPPING.md - All field mappings explained"
