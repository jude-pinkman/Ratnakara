# 🌊 Marine Data Platform - Neon Database Setup

## Quick Start with Neon PostgreSQL

### Database Configuration

Your Neon database is now configured at:
```
postgresql://neondb_owner:npg_RILtOo4bj1Nx@ep-fragrant-dream-amx7i0g1-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

This URL has been automatically added to:
- `backend/.env` (Node.js API server)
- `marine-pipeline-service/.env` (Python data pipelines)

### Step 1: Initialize Database Schema

The schema includes all required tables with proper field mappings:

```bash
# Navigate to the project
cd e:\Projects\using_YT\marine-data-platform

# Connect to Neon database and initialize schema
psql "postgresql://neondb_owner:npg_RILtOo4bj1Nx@ep-fragrant-dream-amx7i0g1-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  -f marine-pipeline-service/schema.sql
```

Or use the validation script:

```bash
# Install dependencies (one-time)
pip install -r marine-pipeline-service/requirements.txt

# Validate schema and field mappings
python schema_validator.py
```

### Step 2: Start the Services

#### Terminal 1 - Backend API Server
```bash
cd backend
npm install  # If not done yet
npm run dev
```
Backend runs on `http://localhost:3001`

#### Terminal 2 - Frontend Dashboard
```bash
cd frontend
npm install  # If not done yet
npm run dev
```
Frontend runs on `http://localhost:3000`

#### Terminal 3 - Data Pipelines (Initial Load)
```bash
cd marine-pipeline-service
python run_pipeline.py all
```
This runs:
1. **NOAA Pipeline** - Fetches real ocean buoy data
2. **Fisheries Generator** - Creates correlated fisheries data
3. **eDNA Generator** - Creates correlated eDNA data
4. **Correlation Generator** - Calculates correlations
5. **Taxonomy Fetcher** - Populates taxonomy table

#### Terminal 4 - Continuous Scheduler
```bash
cd marine-pipeline-service
python orchestrator.py
```
Automatically runs pipelines on a schedule (default: hourly)

## 🔄 Data Flow

```
NOAA API (Real Ocean Data)
    ↓
PostgreSQL Database (Neon)
    ├── ocean_data table
    ├── fisheries_data table (mock, based on ocean conditions)
    ├── edna_data table (mock, based on fisheries)
    ├── taxonomy table
    ├── correlations table
    └── forecasts table
    ↓
Node.js API (backend)
    ↓
Next.js Dashboard (frontend)
    ↓
ML Service (forecasting)
```

## 📊 Field Mapping Validation

The `schema_validator.py` script automatically checks:

1. **Field Existence** - All required fields are present in each table
2. **Type Compatibility** - Fields have compatible data types
3. **API Mapping** - Data from APIs maps correctly to database fields
4. **Connection** - Database connection works properly

### Generated Files
- `FIELD_MAPPING.md` - Detailed field mapping documentation
- `schema_validator.py` output - Validation results

## 🚨 Field Mismatch Detection

If you see warnings about field mismatches:

### NOAA Fields
| DB Field | Type | From API | Notes |
|----------|------|----------|-------|
| station_id | VARCHAR | NOAA station ID | Pre-defined in NOAAPipeline.STATIONS |
| latitude | DOUBLE PRECISION | Station latitude | Hardcoded per station |
| longitude | DOUBLE PRECISION | Station longitude | Hardcoded per station |
| recorded_at | TIMESTAMP | #YY, MM, DD, hh, mm | Converted to ISO timestamp |
| temperature | DOUBLE PRECISION | WTMP field | Converted to numeric, 999/99 → NULL |
| salinity | DOUBLE PRECISION | SAL field | Converted to numeric, 999/99 → NULL |
| wave_height | DOUBLE PRECISION | WVHT field | Converted to numeric, 999/99 → NULL |
| wind_speed | DOUBLE PRECISION | WSPD field | Converted to numeric, 999/99 → NULL |
| source | VARCHAR | (hardcoded) | Always "NOAA_NDBC" |

### Fisheries Fields
| DB Field | Type | From | Notes |
|----------|------|------|-------|
| species | VARCHAR | Mock generator | From SPECIES_REGIONS list |
| latitude | DOUBLE PRECISION | ocean_data | Derived from correlated ocean data |
| longitude | DOUBLE PRECISION | ocean_data | Derived from correlated ocean data |
| recorded_at | TIMESTAMP | Generator | Current timestamp |
| abundance | INTEGER | Generated | Based on temperature correlation |
| biomass | DOUBLE PRECISION | Generated | Derived from abundance |
| diversity_index | DOUBLE PRECISION | Generated | Calculated metric |
| region | VARCHAR | Mock data | From SPECIES_REGIONS |
| source | VARCHAR | Generator | "MOCK" for mock data |
| taxonomy_id | INTEGER | taxonomy table | Foreign key reference |

### eDNA Fields
| DB Field | Type | From | Notes |
|----------|------|------|-------|
| species | VARCHAR | API/Mock | Species name |
| latitude | DOUBLE PRECISION | API/Mock | Sampling location |
| longitude | DOUBLE PRECISION | API/Mock | Sampling location |
| recorded_at | TIMESTAMP | API/Mock | Sampling timestamp |
| concentration | DOUBLE PRECISION | API | eDNA concentration level |
| confidence | DOUBLE PRECISION | API | Quality confidence score (0-1) |
| depth | INTEGER | API | Sampling depth (meters) |
| source | VARCHAR | API | Source system name |
| taxonomy_id | INTEGER | taxonomy table | Foreign key reference |

## ✅ Verification Checklist

After setup, verify everything works:

```bash
# 1. Check database connection
psql "postgresql://neondb_owner:npg_RILtOo4bj1Nx@ep-fragrant-dream-amx7i0g1-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require" \
  -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';"

# 2. Validate schema
python schema_validator.py

# 3. Generate field mapping documentation
python schema_validator.py  # Creates FIELD_MAPPING.md

# 4. Check if data exists
curl http://localhost:3001/api/ocean | jq '.data | length'

# 5. Visit dashboard
open http://localhost:3000
```

## 🛠️ Troubleshooting

### Connection Refused
```bash
# Verify DATABASE_URL is set correctly
echo $DATABASE_URL
cat backend/.env
cat marine-pipeline-service/.env
```

### Schema Not Found
```bash
# Ensure extensions are enabled
psql DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run schema initialization
psql DATABASE_URL -f marine-pipeline-service/schema.sql
```

### Field Type Mismatches
```bash
# Run validator to identify issues
python schema_validator.py

# Check generated FIELD_MAPPING.md for details
cat FIELD_MAPPING.md
```

### No Data Appearing
```bash
# Run pipelines manually
cd marine-pipeline-service
python run_pipeline.py noaa    # Test NOAA pipeline
python run_pipeline.py all     # Run all pipelines

# Check pipeline logs
tail -f pipeline_orchestrator.log
```

## 📈 Production Deployment

For production, use these services:

1. **Database** - Neon PostgreSQL (already set up)
2. **Backend** - Railway/Heroku/Render
3. **Frontend** - Vercel/Netlify
4. **Pipelines** - Background workers on hosting platform

The DATABASE_URL is already configured for cloud deployment!

## 🔐 Security Notes

- The DATABASE_URL includes credentials - never commit to git
- Database credentials are in `.env` files (already gitignored)
- Neon connections use SSL (`sslmode=require`)
- Change credentials after testing in production

---

For detailed API documentation, see:
- `backend/src/routes/*.ts` - API endpoints
- `frontend/app/` - Dashboard pages
- `marine-pipeline-service/pipelines/` - Data pipeline code
