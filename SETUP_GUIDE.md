# 🚀 Marine Data Platform - Complete Setup Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     DATA FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NOAA API → Python Pipeline → PostgreSQL → Node.js API     │
│      ↓                            ↓            ↓           │
│  Real Ocean Data    →   Fisheries Mock    →  Next.js       │
│                          ↓                                  │
│                     eDNA Mock                              │
│                          ↓                                  │
│                     Correlations                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 What This System Does

### Every Hour (Automated):
1. **Fetches real NOAA ocean data** (temperature, salinity, wave height, wind speed)
2. **Generates fisheries data** based on ocean conditions
3. **Generates eDNA data** based on fisheries abundance
4. **Calculates correlations** between environmental factors and species

### Real-time Updates:
- Frontend polls backend every 30 seconds
- New data appears automatically on dashboard
- Live maps and charts update continuously

---

## 🛠️ Step 1: Database Setup (Supabase Recommended)

### Option A: Supabase (Free Cloud PostgreSQL)

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Copy your database connection string
4. Run the schema:

```bash
cd marine-pipeline-service
psql [YOUR_CONNECTION_STRING] -f schema.sql
```

### Option B: Local PostgreSQL

```bash
# Install PostgreSQL + PostGIS
# Windows: Download from postgresql.org
# Mac: brew install postgresql postgis
# Linux: sudo apt-get install postgresql postgis

# Create database
createdb marine_data

# Enable PostGIS
psql marine_data -c "CREATE EXTENSION postgis;"

# Run schema
cd marine-pipeline-service
psql marine_data -f schema.sql
```

---

## 📦 Step 2: Install Dependencies

### Backend (Node.js API)

```bash
cd backend
npm install
```

### Frontend (Next.js)

```bash
cd frontend
npm install
```

### Python Pipeline Service

```bash
cd marine-pipeline-service
pip install -r requirements.txt
```

---

## ⚙️ Step 3: Configure Environment Variables

### Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```env
PORT=3001
DATABASE_URL=postgresql://user:pass@host:5432/marine_data
```

### Pipeline Service `.env`

```bash
cd marine-pipeline-service
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL=postgresql://user:pass@host:5432/marine_data
SCHEDULER_ENABLED=true
SCHEDULER_OCEAN_JOB_MINUTES=60
```

### Frontend `.env.local` (Optional)

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

---

## 🚀 Step 4: Start the System

### Terminal 1: Start Backend API

```bash
cd backend
npm run dev
```

Expected output:
```
Backend server running on port 3001
Database connection successful
```

### Terminal 2: Start Frontend

```bash
cd frontend
npm run dev
```

Expected output:
```
ready - started server on 0.0.0.0:3000
```

### Terminal 3: Run Initial Pipeline (First Time Only)

```bash
cd marine-pipeline-service
python run_pipeline.py all
```

This will:
- Fetch NOAA data
- Generate fisheries data
- Generate eDNA data
- Calculate correlations
- Fetch taxonomy from GBIF

### Terminal 4: Start Automated Scheduler

```bash
cd marine-pipeline-service
python orchestrator.py
```

Expected output:
```
Scheduler configured:
  - Hourly: NOAA → Fisheries → eDNA → Correlations
  - Daily (02:00): Taxonomy updates
Scheduler started.
```

---

## 🔍 Step 5: Verify Everything Works

### 1. Check Backend Health

```bash
curl http://localhost:3001/health
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "...",
  "version": "2.0.0"
}
```

### 2. Check Database Has Data

```bash
psql marine_data -c "SELECT COUNT(*) FROM ocean_data;"
psql marine_data -c "SELECT COUNT(*) FROM fisheries_data;"
psql marine_data -c "SELECT COUNT(*) FROM edna_data;"
```

### 3. Test API Endpoints

```bash
# Ocean data
curl http://localhost:3001/api/ocean | jq

# Fisheries data
curl http://localhost:3001/api/fisheries | jq

# eDNA data
curl http://localhost:3001/api/edna | jq

# Correlations
curl http://localhost:3001/api/correlation | jq
```

### 4. Open Frontend

Go to: http://localhost:3000

You should see:
- Live ocean data map
- Fisheries charts
- eDNA concentration graphs
- Correlation analysis

---

## 📊 Data Pipeline Details

### Pipeline Schedule

| Task | Frequency | Description |
|------|-----------|-------------|
| NOAA Ocean Data | Every hour | Fetches real buoy data from 4 stations |
| Fisheries Generation | Every hour | Creates mock data based on ocean conditions |
| eDNA Generation | Every hour | Creates mock data based on fisheries |
| Correlations | Every hour | Calculates relationships |
| Taxonomy | Daily (2 AM) | Updates species data from GBIF |

### Data Sources

**Real Data:**
- NOAA NDBC Buoys (4 stations)
- GBIF Taxonomy API

**Mock Data (Science-Based):**
- Fisheries: Generated using temperature correlations
- eDNA: Generated based on fish abundance

### Database Tables

```sql
ocean_data       -- Real NOAA data
fisheries_data   -- Mock (temperature-linked)
edna_data        -- Mock (abundance-linked)
taxonomy         -- Real GBIF data
correlations     -- Auto-calculated
```

---

## 🛠️ Manual Pipeline Commands

Run specific pipelines:

```bash
cd marine-pipeline-service

# Run individual pipelines
python run_pipeline.py noaa         # Fetch ocean data only
python run_pipeline.py fisheries    # Generate fisheries only
python run_pipeline.py edna         # Generate eDNA only
python run_pipeline.py correlation  # Calculate correlations only
python run_pipeline.py taxonomy     # Fetch taxonomy only

# Run all in sequence
python run_pipeline.py all
```

---

## 🧪 Testing Live Updates

1. Open dashboard: http://localhost:3000/dashboard
2. Note the "Last Updated" timestamp
3. Wait 30 seconds
4. Data should refresh automatically
5. Check browser console for polling logs

---

## 🎨 Frontend Live Data Hook

Example usage in React components:

```tsx
import { useLiveOceanData } from '@/hooks/useLiveData';

function OceanDashboard() {
  const { data, loading, error, lastUpdate } = useLiveOceanData();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Last Update: {lastUpdate?.toLocaleTimeString()}</p>
      <p>Records: {data?.length}</p>
      {/* Your charts/maps here */}
    </div>
  );
}
```

---

## 📈 Expected Results

After the first pipeline run, you should have:
- **Ocean Data**: 40-80 records (NOAA buoys)
- **Fisheries Data**: 40-80 records (1:1 with ocean data)
- **eDNA Data**: 40-80 records (1:1 with fisheries)
- **Correlations**: 3-5 species correlations
- **Taxonomy**: 10 marine species

Every hour, these numbers grow automatically.

---

## 🔄 System Flow Summary

```
Every hour:
  1. NOAA fetches data → ocean_data table
  2. Fisheries generator reads ocean_data → fisheries_data table
  3. eDNA generator reads fisheries_data → edna_data table
  4. Correlation calculator joins tables → correlations table

Every 30 seconds:
  Frontend polls API → Updates dashboard
```

---

## 🐛 Troubleshooting

### Pipeline fails with "No ocean data"
```bash
# Run NOAA pipeline first
python run_pipeline.py noaa
# Then run others
python run_pipeline.py all
```

### Frontend shows empty data
- Check backend is running: `curl http://localhost:3001/health`
- Check database has data: `psql marine_data -c "SELECT COUNT(*) FROM ocean_data;"`
- Check API endpoints: `curl http://localhost:3001/api/ocean`

### Database connection fails
- Verify DATABASE_URL is correct
- Test connection: `psql [YOUR_DATABASE_URL]`
- Check PostgreSQL is running

### Scheduler not running
- Check SCHEDULER_ENABLED=true in `.env`
- Look for errors in `pipeline_orchestrator.log`

---

## 📊 Monitoring

### Check Ingestion Logs

```sql
SELECT * FROM ingestion_logs ORDER BY created_at DESC LIMIT 10;
```

### Check Latest Data

```sql
-- Latest ocean data
SELECT * FROM ocean_data ORDER BY recorded_at DESC LIMIT 5;

-- Latest fisheries
SELECT * FROM fisheries_data ORDER BY recorded_at DESC LIMIT 5;

-- Latest eDNA
SELECT * FROM edna_data ORDER BY recorded_at DESC LIMIT 5;
```

---

## 🎯 Success Criteria

Your system is working correctly when:

✅ Backend API returns data
✅ Frontend dashboard shows charts
✅ Data updates every 30 seconds
✅ Pipeline runs every hour
✅ Database has growing records
✅ Correlations show relationships

---

## 🚀 Production Deployment

### Supabase (Database)
1. Use connection pooling
2. Enable SSL
3. Set up backups

### Vercel (Frontend)
```bash
cd frontend
vercel deploy
```

### Railway/Heroku (Backend + Pipeline)
- Deploy backend as web service
- Deploy pipeline as worker process
- Set environment variables

---

## 📝 File Structure

```
marine-data-platform/
├── backend/                 # Node.js API
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   └── db/             # Database connection
│   └── package.json
├── frontend/               # Next.js UI
│   ├── app/                # Pages
│   ├── hooks/              # Live data hooks
│   └── components/         # UI components
├── marine-pipeline-service/ # Python pipelines
│   ├── pipelines/          # Data ingestion
│   │   ├── noaa_pipeline.py
│   │   ├── fisheries_generator.py
│   │   ├── edna_generator.py
│   │   ├── taxonomy_fetcher.py
│   │   └── correlation_generator.py
│   ├── orchestrator.py     # Scheduler
│   ├── run_pipeline.py     # Manual runner
│   └── schema.sql          # Database schema
└── README.md
```

---

## 🎓 Next Steps

1. **Add ML forecasting** - Predict future fish abundance
2. **Add alerts** - Notify when anomalies detected
3. **Add map filters** - Filter by region, species, date
4. **Add exports** - Download data as CSV/JSON
5. **Add authentication** - Secure admin features

---

## 📞 Support

- Database issues: Check `schema.sql` and connection string
- Pipeline issues: Check `pipeline_orchestrator.log`
- API issues: Check backend console logs
- Frontend issues: Check browser console

---

## 🏆 You Now Have:

✅ **Real NOAA ocean data** streaming every hour
✅ **Science-based mock data** for fisheries and eDNA
✅ **Automated pipelines** running 24/7
✅ **Live dashboard** updating every 30 seconds
✅ **Complete PostgreSQL database** with 5 data tables
✅ **Production-ready architecture** ready to scale

**Enjoy your marine data platform!** 🌊🐟🧬
