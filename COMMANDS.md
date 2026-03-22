# Quick Reference Commands

## Development Commands

### Start All Services (Development)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 - ML Service:**
```bash
cd ml-service
source venv/bin/activate  # Windows: venv\Scripts\activate
python main.py
# Runs on http://localhost:8000
```

---

## Database Commands

### Create Database
```bash
# Using psql
psql -U postgres
CREATE DATABASE marine_data;
\q

# Or single command
createdb -U postgres marine_data
```

### Run Schema
```bash
psql -U postgres -d marine_data -f backend/src/db/schema.sql
```

### Seed Data
```bash
cd backend
npm run seed
```

### Backup Database
```bash
pg_dump -U postgres marine_data > backup.sql
```

### Restore Database
```bash
psql -U postgres -d marine_data < backup.sql
```

### Drop and Recreate
```bash
dropdb -U postgres marine_data
createdb -U postgres marine_data
psql -U postgres -d marine_data -f backend/src/db/schema.sql
cd backend && npm run seed
```

---

## Docker Commands

### Start with Docker Compose
```bash
docker-compose up -d
```

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f ml-service
```

### Stop Services
```bash
docker-compose down
```

### Rebuild Services
```bash
docker-compose build
docker-compose up -d
```

### Execute Command in Container
```bash
docker exec -it marine-backend npm run seed
docker exec -it marine-postgres psql -U postgres -d marine_data
```

---

## Build Commands

### Backend
```bash
cd backend
npm install
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm start
```

### ML Service
```bash
cd ml-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

---

## Testing Commands

### Test Backend API
```bash
# Health check
curl http://localhost:3001/health

# Get ocean data
curl http://localhost:3001/api/ocean/kpis

# Get fisheries metrics
curl http://localhost:3001/api/fisheries/metrics
```

### Test ML Service
```bash
# Health check
curl http://localhost:8000/health

# Test chatbot
curl -X POST http://localhost:8000/chatbot \
  -H "Content-Type: application/json" \
  -d '{"question": "what is edna"}'

# Test LSTM forecast
curl -X POST http://localhost:8000/predict/lstm \
  -H "Content-Type: application/json" \
  -d '{"species": "Sardinella longiceps", "months": 6}'
```

---

## PM2 Commands (Production)

### Start Services
```bash
# Backend
cd backend
pm2 start dist/app.js --name marine-backend

# Frontend
cd frontend
pm2 start npm --name marine-frontend -- start

# ML Service
cd ml-service
pm2 start "uvicorn main:app --host 0.0.0.0 --port 8000" --name marine-ml
```

### Monitor
```bash
pm2 list
pm2 monit
pm2 logs
pm2 logs marine-backend
```

### Manage
```bash
pm2 restart all
pm2 restart marine-backend
pm2 stop all
pm2 delete all
```

### Save Configuration
```bash
pm2 save
pm2 startup
```

---

## Git Commands

### Initial Setup
```bash
git init
git add .
git commit -m "Initial commit: Marine Data Platform"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Daily Workflow
```bash
git status
git add .
git commit -m "Your commit message"
git push
```

### Branch Management
```bash
git checkout -b feature/new-feature
git checkout main
git merge feature/new-feature
git branch -d feature/new-feature
```

---

## Package Management

### Backend/Frontend
```bash
# Install dependency
npm install <package-name>

# Install dev dependency
npm install -D <package-name>

# Update dependencies
npm update

# Audit security
npm audit
npm audit fix
```

### ML Service
```bash
# Activate venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install package
pip install <package-name>

# Update requirements.txt
pip freeze > requirements.txt

# Deactivate venv
deactivate
```

---

## Troubleshooting Commands

### Check Ports
```bash
# Check if port is in use
# Windows:
netstat -ano | findstr :3000
netstat -ano | findstr :3001
netstat -ano | findstr :8000

# Mac/Linux:
lsof -i :3000
lsof -i :3001
lsof -i :8000

# Kill process
# Windows:
taskkill /PID <PID> /F

# Mac/Linux:
kill -9 <PID>
```

### Clear Cache
```bash
# Backend
cd backend
rm -rf node_modules dist
npm install
npm run build

# Frontend
cd frontend
rm -rf node_modules .next
npm install
npm run build

# ML Service
cd ml-service
rm -rf venv __pycache__
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database Connection Test
```bash
# Test connection
psql -U postgres -d marine_data -c "SELECT 1;"

# Check running services
# Windows:
sc query postgresql
net start postgresql

# Mac/Linux:
sudo service postgresql status
sudo systemctl status postgresql
```

---

## Environment Variables

### Set Environment Variables

**Windows:**
```cmd
set DB_HOST=localhost
set DB_PORT=5432
```

**Mac/Linux:**
```bash
export DB_HOST=localhost
export DB_PORT=5432
```

**Permanent (add to .env):**
```bash
# backend/.env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=marine_data
DB_USER=postgres
DB_PASSWORD=your_password
PORT=3001

# frontend/.env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Useful Queries

### Database Queries
```sql
-- Count records
SELECT COUNT(*) FROM ocean_data;
SELECT COUNT(*) FROM fisheries_data;
SELECT COUNT(*) FROM edna_data;

-- Recent data
SELECT * FROM ocean_data ORDER BY recorded_at DESC LIMIT 10;

-- Species list
SELECT DISTINCT species FROM fisheries_data;

-- Environmental averages
SELECT
  AVG(temperature) as avg_temp,
  AVG(salinity) as avg_sal,
  AVG(ph) as avg_ph
FROM ocean_data;
```

---

## Performance Monitoring

### Node.js Memory Usage
```bash
node --max-old-space-size=4096 dist/app.js
```

### Database Performance
```sql
-- Show slow queries
SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Quick Fixes

### Port Already in Use
```bash
# Backend
PORT=3002 npm run dev

# Frontend
PORT=3001 npm run dev

# ML Service
uvicorn main:app --port 8001
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
# Windows: Services > PostgreSQL
# Mac/Linux: sudo service postgresql start

# Verify credentials in .env
cat backend/.env
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Keyboard Shortcuts

### Terminal
- `Ctrl+C` - Stop running process
- `Ctrl+Z` - Suspend process
- `Ctrl+D` - Exit terminal/session
- `Ctrl+R` - Search command history

### VS Code
- `Ctrl+` ` - Toggle terminal
- `Ctrl+Shift+P` - Command palette
- `Ctrl+P` - Quick file open
- `Ctrl+Shift+F` - Search in files

---

## URLs Reference

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **ML Service:** http://localhost:8000
- **ML API Docs:** http://localhost:8000/docs
- **PostgreSQL:** localhost:5432

---

## Common Workflows

### Add New Feature
```bash
1. git checkout -b feature/new-feature
2. Make changes
3. npm run dev (test locally)
4. git add .
5. git commit -m "Add new feature"
6. git push origin feature/new-feature
7. Create pull request
```

### Deploy Update
```bash
1. git pull origin main
2. npm install (if dependencies changed)
3. npm run build
4. pm2 restart all
```

### Reset Everything
```bash
# Stop all services
pm2 delete all
docker-compose down

# Clean everything
rm -rf backend/node_modules frontend/node_modules ml-service/venv
rm -rf backend/dist frontend/.next

# Recreate database
dropdb marine_data
createdb marine_data
psql -d marine_data -f backend/src/db/schema.sql

# Reinstall & restart
npm install --workspaces
cd ml-service && python -m venv venv && pip install -r requirements.txt
npm run seed
# Start services again
```
