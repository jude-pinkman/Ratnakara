@echo off
REM Deep eDNA Shape Analyzer - Quick Start Script (Windows)
REM This script sets up and starts all services

setlocal enabledelayedexpansion
set "ROOT=%~dp0..\.."
cd /d %ROOT%

echo.
echo 🧬 Deep eDNA Shape Analyzer - Quick Start
echo ==========================================
echo.

REM Step 1: Install backend dependencies
echo 📦 Installing backend dependencies...
cd backend
call npm install
echo ✓ Backend dependencies installed
cd ..
echo.

REM Step 2: Set up Python environment
echo 🐍 Setting up Python virtual environment...
cd ml-service

if not exist "venv" (
    python -m venv venv
    echo ✓ Virtual environment created
) else (
    echo ✓ Virtual environment already exists
)

REM Activate and install
call venv\Scripts\activate.bat
pip install -r requirements_edna_shape.txt
echo ✓ Python dependencies installed

call venv\Scripts\deactivate.bat
cd ..
echo.

REM Step 3: Install frontend dependencies
echo 📦 Installing frontend dependencies...
cd frontend
call npm install
echo ✓ Frontend dependencies installed
cd ..
echo.

REM Step 4: Create environment file
echo ⚙️  Creating .env file...
if not exist "backend\.env" (
    (
        echo ML_SERVICE_URL=http://localhost:8000
        echo NODE_ENV=development
        echo PORT=3001
    ) > backend\.env
    echo ✓ .env file created
) else (
    echo ✓ .env file already exists
)
echo.

REM Step 5: Display startup instructions
echo 🎯 Setup Complete!
echo ====================
echo.
echo To start the services, open 3 command prompts and run:
echo.
echo Command Prompt 1 (Backend - Express^):
echo   cd backend
echo   npm run dev
echo.
echo Command Prompt 2 (ML Service - FastAPI^):
echo   cd ml-service
echo   venv\Scripts\activate
echo   python edna_shape.py
echo.
echo Command Prompt 3 (Frontend - Next.js^):
echo   cd frontend
echo   npm run dev
echo.
echo Then open your browser to:
echo   http://localhost:3000/edna-shape-analyzer
echo.
echo Or use Docker Compose:
echo   docker-compose -f docker-compose.edna-shape.yml up --build
echo.
echo Check health:
echo   curl http://localhost:3001/api/edna-shape/health
echo.
echo.

pause
