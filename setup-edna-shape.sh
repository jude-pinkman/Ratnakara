#!/bin/bash
# Deep eDNA Shape Analyzer - Quick Start Script
# This script sets up and starts all services

set -e

echo "🧬 Deep eDNA Shape Analyzer - Quick Start"
echo "=========================================="
echo ""

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    PYTHON="python"
    ACTIVATE="venv\Scripts\activate"
else
    PYTHON="python3"
    ACTIVATE="source venv/bin/activate"
fi

# Step 1: Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✓ Backend dependencies installed"
cd ..
echo ""

# Step 2: Set up Python environment
echo "🐍 Setting up Python virtual environment..."
cd ml-service

if [ ! -d "venv" ]; then
    $PYTHON -m venv venv
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists"
fi

# Activate and install
. venv/bin/activate 2>/dev/null || . venv/Scripts/activate 2>/dev/null || true
pip install -r requirements_edna_shape.txt
echo "✓ Python dependencies installed"

deactivate 2>/dev/null || true
cd ..
echo ""

# Step 3: Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
echo "✓ Frontend dependencies installed"
cd ..
echo ""

# Step 4: Create environment file
echo "⚙️  Creating .env file..."
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << EOF
ML_SERVICE_URL=http://localhost:8000
NODE_ENV=development
PORT=3001
EOF
    echo "✓ .env file created"
else
    echo "✓ .env file already exists"
fi
echo ""

# Step 5: Display startup instructions
echo "🎯 Setup Complete!"
echo "===================="
echo ""
echo "To start the services, open 3 terminals and run:"
echo ""
echo "Terminal 1 (Backend - Express):"
echo "  cd backend && npm run dev"
echo ""
echo "Terminal 2 (ML Service - FastAPI):"
echo "  cd ml-service"
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo "  venv\Scripts\activate"
else
    echo "  source venv/bin/activate"
fi
echo "  python edna_shape.py"
echo ""
echo "Terminal 3 (Frontend - Next.js):"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:3000/edna-shape-analyzer"
echo ""
echo "Or use Docker Compose:"
echo "  docker-compose -f docker-compose.edna-shape.yml up --build"
echo ""
echo "Check health:"
echo "  curl http://localhost:3001/api/edna-shape/health"
echo ""
