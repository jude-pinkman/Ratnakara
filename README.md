d# 🌊 Marine Data Platform - Quick Start

## ⚡ 5-Minute Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ with PostGIS

### 1. Database Setup (Choose One)

**Option A: Supabase (Recommended)**
```bash
# 1. Create project at supabase.com
# 2. Copy connection string
# 3. Run schema
psql [CONNECTION_STRING] -f marine-pipeline-service/schema.sql
```

**Option B: Local PostgreSQL**
```bash
createdb marine_data
psql marine_data -c "CREATE EXTENSION postgis;"
psql marine_data -f marine-pipeline-service/schema.sql
```

### 2. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit DATABASE_URL

# Pipeline
cd ../marine-pipeline-service
cp .env.example .env
# Edit DATABASE_URL

# Frontend
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

### 3. Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# Pipeline
cd ../marine-pipeline-service
pip install -r requirements.txt
```

### 4. Start Services (4 Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Initial Data:**
```bash
cd marine-pipeline-service
python run_pipeline.py all
```

**Terminal 4 - Scheduler:**
```bash
cd marine-pipeline-service
python orchestrator.py
```

### 5. Open Dashboard

```
http://localhost:3000
```

## 🎯 What You Get

- ✅ Real NOAA ocean data (every hour)
- ✅ Smart mock fisheries data
- ✅ Smart mock eDNA data
- ✅ Auto-calculated correlations
- ✅ Live-updating dashboard (30s refresh)

## 📊 System Flow

```
NOAA API → Ocean Data → Mock Fisheries → Mock eDNA → Correlations
                ↓
         PostgreSQL Database
                ↓
           Node.js API
                ↓
         Next.js Dashboard
          (updates every 30s)
```

## 🔍 Verify It Works

```bash
# Check data
psql marine_data -c "SELECT COUNT(*) FROM ocean_data;"
psql marine_data -c "SELECT COUNT(*) FROM fisheries_data;"

# Test API
curl http://localhost:3001/api/ocean
curl http://localhost:3001/api/fisheries
```

## 📚 Full Documentation

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for:
- Detailed architecture
- Troubleshooting
- Production deployment
- API reference

## 🚀 Production Deployment

1. **Database**: Use Supabase free tier
2. **Backend**: Deploy to Railway/Heroku
3. **Frontend**: Deploy to Vercel
4. **Pipeline**: Deploy as background worker

```bash
# Frontend
cd frontend && vercel deploy

# Backend + Pipeline
# Use Railway/Heroku with Procfile:
# web: cd backend && npm start
# worker: cd marine-pipeline-service && python orchestrator.py
```

## 🧪 Quick Test

```bash
# Run one pipeline manually
cd marine-pipeline-service
python run_pipeline.py noaa

# Check results
curl http://localhost:3001/api/ocean | jq '.data | length'
```

## 🎓 Key Files

- `marine-pipeline-service/schema.sql` - Database structure
- `marine-pipeline-service/orchestrator.py` - Automated scheduler
- `backend/src/db/database.ts` - Database connection
- `frontend/hooks/useLiveData.ts` - Live polling hook

## 🐛 Common Issues

**"No ocean data"**: Run `python run_pipeline.py noaa` first

**"Connection refused"**: Check DATABASE_URL in `.env` files

**Empty dashboard**: Wait 30 seconds for first poll, or check backend logs

---

**That's it! You now have a working marine data platform.** 🌊🐟🧬

For detailed setup, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)
