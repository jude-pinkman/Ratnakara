# Marine Data Platform

## Project Summary

Marine Data Platform is a multi-service workspace for marine analytics, biodiversity insights, forecasting, and eDNA-related workflows.

The repository includes:

1. A TypeScript backend API for marine domain data endpoints.
2. A Next.js frontend dashboard with multiple domain pages (ocean, fisheries, eDNA, taxonomy, correlations, maps, and more).
3. An ML service (FastAPI + scikit-learn/TensorFlow) for forecasting and classification.
4. A marine pipeline service (FastAPI + PostgreSQL/PostGIS) for ingestion, linking, and correlation workflows.
5. Scripts and utilities for data shaping, taxonomy processing, and maintenance tasks.

This README is the single source of documentation for project overview, setup, and run instructions.

## Repository Structure

```text
Marine/
  backend/                  Express + TypeScript API
  frontend/                 Next.js app
  ml-service/               FastAPI ML service
  marine-pipeline-service/  FastAPI ingestion/pipeline service
      scripts/                  Data and maintenance scripts
            utilities/python/       DB diagnostics and schema utilities
            launchers/windows/      Windows start scripts
            bootstrap/              eDNA shape setup scripts
  data/                     Source/reference datasets
  Taxonomyformatter/        Taxonomy transformation utilities
  docker-compose.yml        Core container stack (backend, frontend, ml)
```

## Prerequisites

1. Node.js 18+ and npm
2. Python 3.10 recommended
3. PostgreSQL with PostGIS (required for `marine-pipeline-service`)
4. Git
5. Docker Desktop (optional, for containerized runs)

## Setup Guide

### 1. Install Workspace Dependencies

From repo root:

```powershell
npm.cmd install
```

### 2. Backend Setup

```powershell
Set-Location backend
npm.cmd install
```

### 3. Frontend Setup

```powershell
Set-Location frontend
npm.cmd install
```

### 4. ML Service Setup

```powershell
Set-Location ml-service
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

### 5. Marine Pipeline Service Setup

```powershell
Set-Location marine-pipeline-service
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env` and set `DATABASE_URL` for your database.

For Neon or any async SQLAlchemy setup, use:

```text
postgresql+asyncpg://user:password@host:5432/dbname?ssl=require
```

## How To Run Everything

## Option A: Core App (Frontend + Backend)

This is the fastest way to run the main experience.

Terminal 1 (backend):

```powershell
Set-Location backend
npm.cmd run dev
```

Terminal 2 (frontend):

```powershell
Set-Location frontend
npm.cmd run dev
```

Default endpoints:

1. Backend: `http://localhost:3001`
2. Frontend: `http://localhost:3010`

Note: frontend `npm run dev` includes route warm-up so pages compile automatically at startup.

## Option B: Add ML Service

Terminal 3:

```powershell
Set-Location ml-service
venv\Scripts\Activate.ps1
python main.py
```

ML service endpoint:

1. ML API: `http://localhost:8000`

## Option C: Add Marine Pipeline Service

Terminal 4:

```powershell
Set-Location marine-pipeline-service
venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --host 127.0.0.1 --port 8090
```

Pipeline API endpoint:

1. Pipeline API: `http://127.0.0.1:8090`

Run health/check script:

```powershell
Set-Location marine-pipeline-service
python run_pipeline_checks.py
```

If you run on a different port:

```powershell
$env:PIPELINE_BASE_URL='http://127.0.0.1:8091'
python run_pipeline_checks.py
```

## Option D: Docker (Core Stack)

From repo root:

```powershell
docker-compose up -d
```

Stop:

```powershell
docker-compose down
```

## Useful Commands

From repo root:

```powershell
npm.cmd run dev:backend
npm.cmd run dev:frontend
npm.cmd run docker:up
npm.cmd run docker:down
```

Windows launcher scripts:

```powershell
scripts\launchers\windows\start-app.bat
scripts\launchers\windows\start-frontend.bat
```

Utility scripts:

```powershell
python scripts\utilities\python\check_ocean_data.py
python scripts\utilities\python\init_database.py
python scripts\utilities\python\schema_validator.py
```

Backend build:

```powershell
Set-Location backend
npm.cmd run build
```

Frontend production build:

```powershell
Set-Location frontend
npm.cmd run build
```

## Troubleshooting

1. `EADDRINUSE` on startup
      - The port is already occupied. Start on another port or stop the running process.

2. Pipeline checker shows connection refused
      - Ensure pipeline API is running and checker points to the correct port.

3. Pipeline DB startup errors
      - Verify `DATABASE_URL` format and credentials.
      - For async SQLAlchemy, use `postgresql+asyncpg://...`.

4. PowerShell blocks `npm`/`npx` scripts
      - Use `npm.cmd` and `npx.cmd`.

5. Frontend compiles routes on first visit only
      - Use `npm.cmd run dev` in `frontend`; warm-up is built in.

## API Surface (High Level)

Backend route groups include:

1. `/api/ocean`
2. `/api/fisheries`
3. `/api/edna`
4. `/api/taxonomy`
5. `/api/correlation`
6. `/api/forecast`
7. `/api/geo`
8. `/api/insights`
9. `/api/biodiversity`
10. `/api/alerts`

ML service includes prediction endpoints such as:

1. `/predict/lstm`
2. `/predict/random-forest`
3. `/predict/regression`
4. `/predict/otolith`

Pipeline service includes endpoints such as:

1. `/health`
2. `/ingest/ocean`
3. `/ingest/fisheries`
4. `/ingest/edna`
5. `/correlations/recompute`
6. `/forecast`
