@echo off
echo ======================================
echo Marine Data Platform - Quick Setup
echo ======================================

REM Check prerequisites
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is required but not installed. Aborting.
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python is required but not installed. Aborting.
    exit /b 1
)

where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PostgreSQL is required but not installed. Aborting.
    exit /b 1
)

echo Check Prerequisites check passed

REM Setup Backend
echo.
echo Setting up Backend...
cd backend

if not exist .env (
    copy .env.example .env
    echo Created .env file. Please update with your database credentials.
)

call npm install
echo Check Backend dependencies installed

REM Setup Frontend
echo.
echo Setting up Frontend...
cd ..\frontend

if not exist .env (
    copy .env.example .env
)

call npm install
echo Check Frontend dependencies installed

REM Setup ML Service
echo.
echo Setting up ML Service...
cd ..\ml-service

python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
if not exist models\saved mkdir models\saved
echo Check ML Service dependencies installed

call venv\Scripts\deactivate

echo.
echo ======================================
echo Setup Complete!
echo ======================================
echo.
echo Next steps:
echo 1. Create PostgreSQL database using psql: CREATE DATABASE marine_data;
echo 2. Run database schema: psql -U postgres -d marine_data -f backend\src\db\schema.sql
echo 3. Seed data: cd backend ^&^& npm run seed
echo 4. Start services:
echo    - Backend: cd backend ^&^& npm run dev
echo    - Frontend: cd frontend ^&^& npm run dev
echo    - ML Service: cd ml-service ^&^& venv\Scripts\activate ^&^& python main.py
echo.
echo Access the app at: http://localhost:3000

pause
