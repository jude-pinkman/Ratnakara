# 🚀 Quick Start - Marine Data Platform with Neon DB

## Your Neon Database is Ready! ✅

```
Database: postgresql://neondb_owner:npg_RILtOo4bj1Nx@ep-fragrant-dream-amx7i0g1-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
Region: US-East-1
Status: Active
Updated: ✅ backend/.env, ✅ marine-pipeline-service/.env
```

## 1️⃣ ONE-TIME SETUP (5 minutes)

```bash
cd e:\Projects\using_YT\marine-data-platform

# Initialize database schema
python3 init_database.py

# Validate field mapping (ensure no mismatches)
python3 schema_validator.py
```

**Expected output**: ✅ All validations passed!

## 2️⃣ START SERVICES (4 terminals, run these in parallel)

### Terminal 1: Backend API
```bash
cd backend
npm run dev
```
Runs on `http://localhost:3001/api/*`

### Terminal 2: Frontend Dashboard
```bash
cd frontend
npm run dev
```
Runs on `http://localhost:3000`

### Terminal 3: Initial Data Load
```bash
cd marine-pipeline-service
python run_pipeline.py all
```
Loads all data from APIs into database (runs once)

### Terminal 4: Continuous Scheduler
```bash
cd marine-pipeline-service
python orchestrator.py
```
Runs pipelines hourly automatically

## 3️⃣ VERIFY IT WORKS

```bash
# Check database has data
curl http://localhost:3001/api/ocean | jq '.data | length'

# Open dashboard
open http://localhost:3000
```

---

## 🔄 Data Collection Pipeline

| Source | Table | Frequency | Fields |
|--------|-------|-----------|--------|
| **NOAA NDBC** (Real) | ocean_data | Hourly | temperature, salinity, wave_height, wind_speed |
| **Mock Generator** | fisheries_data | Hourly | species, abundance, biomass, diversity_index |
| **Mock Generator** | edna_data | Hourly | species, concentration, confidence, depth |
| **GBIF API** | taxonomy | On-demand | kingdom, phylum, class, order, family, genus |
| **Computed** | correlations | Hourly | correlation_coefficient |

## 📊 Field Mapping (No Mismatches!)

✅ **NOAA Fields**: temperature, salinity → 999/99 = NULL
✅ **Fisheries Fields**: abundance = temperature_factor × 1000
✅ **eDNA Fields**: concentration correlated with abundance  
✅ **Taxonomy Fields**: GBIF scientific names → species lookup
✅ **Geospatial**: All locations use PostGIS POINT(lat,lon)

## 📚 Documentation Files

- `SETUP_COMPLETE.md` - This setup + field mappings
- `NEON_DATABASE_SETUP.md` - Comprehensive guide
- `PIPELINE_FIELD_MAPPING.md` - Technical details
- `FIELD_MAPPING.md` - Auto-generated (run `schema_validator.py`)

## 🛠️ Troubleshooting

**"Connection refused"**
```bash
# Verify DATABASE_URL is set
cat backend/.env | grep DATABASE_URL
cat marine-pipeline-service/.env | grep DATABASE_URL
```

**"No data appearing"**
```bash
cd marine-pipeline-service
python run_pipeline.py noaa  # Test NOAA pipeline
tail -f pipeline_orchestrator.log  # Check logs
```

**"Field type errors"**
```bash
python3 schema_validator.py  # Full validation report
cat FIELD_MAPPING.md  # See expected vs actual
```

---

**You're all set!** Open http://localhost:3000 and start exploring. 🌊🐟
