# Marine Pipeline Service

FastAPI + Pandas service for ingesting, transforming, linking, and analyzing marine data in real time.

## Features
- Ingestion endpoints for ocean, fisheries, and eDNA datasets
- Real open-data connectors: NOAA, Copernicus, OBIS, GBIF, FAO
- Common schema transformation with UTC normalization and unit conversion
- Async SQLAlchemy with PostgreSQL + PostGIS
- Geospatial/time linking and correlation generation
- Fish abundance forecasting (RandomForestRegressor)
- Ocean anomaly detection (IsolationForest)
- APScheduler hourly pipeline automation

## Prerequisites
- Python 3.10+
- PostgreSQL with PostGIS enabled
- Network access to external APIs (NOAA, Copernicus, OBIS, GBIF, FAO)

## Environment Setup
1. From this folder, create and activate a virtual environment.
2. Install dependencies:
    python -m pip install -r requirements.txt
3. Create local env file:
    Copy-Item .env.example .env
4. Edit .env and set DATABASE_URL.

## Database URL Rules
This service uses SQLAlchemy async engine with asyncpg, so the URL must be asyncpg-compatible.

- Use this scheme:
   postgresql+asyncpg://user:password@host:5432/dbname

- If your source URL is from another service (for example backend/.env) and starts with:
   postgresql://
   change it to:
   postgresql+asyncpg://

- For TLS connections (for example Neon), use:
   ssl=require
   and remove unsupported channel_binding parameter for asyncpg.

Example conversion:
- Input:
   postgresql://user:password@host/dbname?sslmode=require&channel_binding=require
- Output:
   postgresql+asyncpg://user:password@host/dbname?ssl=require

## Run The API
PowerShell:
- python -m uvicorn app.main:app --host 0.0.0.0 --port 8090

With auto-reload for development:
- python -m uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload

## Verify It Is Running
- Open:
   http://127.0.0.1:8090/health
- Expected response:
   {"status":"ok"}

## Common Startup Issues
- Error: password authentication failed for user
   - Cause: wrong database credentials or host.
   - Fix: verify DATABASE_URL values and network access.

- Error: connect() got an unexpected keyword argument sslmode
   - Cause: asyncpg does not accept sslmode in URL query.
   - Fix: replace sslmode=require with ssl=require.

- Error: connection refused
   - Cause: database server is not reachable.
   - Fix: start database service or correct host and port.

## API Endpoints
- POST /ingest/ocean
- POST /ingest/fisheries
- POST /ingest/edna
- GET /ocean?lat=&lon=
- GET /species?name=
- GET /correlations?species=
- GET /forecast?species=
- GET /health
