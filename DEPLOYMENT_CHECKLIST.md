# Phase 1 MVP Deployment Checklist

## Pre-Deployment Verification

### 1. Code Quality
- [ ] All TypeScript files compile without errors
  ```bash
  npm run build
  ```
- [ ] No console errors or warnings in browser (frontend)
- [ ] Backend passes linting
  ```bash
  npm run lint
  ```
- [ ] Frontend passes linting

### 2. Environment Configuration
- [ ] `.env` file configured for backend
  - [ ] DATABASE_URL pointing to correct PostgreSQL instance
  - [ ] NODE_ENV set to 'production'
  - [ ] STRICT_TAXONOMY set appropriately
- [ ] `.env.local` configured for frontend
  - [ ] NEXT_PUBLIC_API_URL pointing to backend
  - [ ] NEXT_PUBLIC_ML_URL pointing to ML service

### 3. Dependencies
- [ ] All npm/pip dependencies installed
  ```bash
  cd backend && npm install
  cd ../frontend && npm install
  cd ../ml-service && pip install -r requirements.txt
  ```
- [ ] No security vulnerabilities
  ```bash
  npm audit
  pip check
  ```

### 4. Database
- [ ] PostgreSQL running and accessible
  ```bash
  psql -U postgres -d ratnakara_db -c "SELECT version();"
  ```
- [ ] Schema v2 applied successfully
  ```bash
  psql -U postgres -d ratnakara_db -f backend/src/db/schema-v2.sql
  ```
- [ ] All new tables created
  ```bash
  psql -U postgres -d ratnakara_db -c "\dt"
  ```
- [ ] Indexes created
  ```bash
  psql -U postgres -d ratnakara_db -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname='public';"
  ```
- [ ] Foreign key constraints validated

---

## Deployment Steps

### Step 1: Database Migration
```bash
# Backup current database
pg_dump -U postgres ratnakara_db > backup-$(date +%Y%m%d).sql

# Apply schema v2
psql -U postgres -d ratnakara_db -f backend/src/db/schema-v2.sql

# Verify migration
psql -U postgres -d ratnakara_db -c "SELECT COUNT(*) FROM occurrences;"
```

**Verification:** ✓ No errors, tables created

### Step 2: Backend Deployment
```bash
# Build TypeScript
cd backend
npm run build

# Start service
npm start

# Verify startup
curl http://localhost:5000/health
```

**Verification:** ✓ Service responds to health check

### Step 3: DNA Sequence Service
```bash
# Verify FASTA parsing
npm run test:importers:dna

# Check sample sequences loaded
psql -U postgres -d ratnakara_db -c "SELECT COUNT(*) FROM dna_sequences;"
```

**Verification:** ✓ DNA sequences accessible

### Step 4: Otolith Service
```bash
# Verify otolith import
npm run test:importers:otolith

# Check temperature inference working
psql -U postgres -d ratnakara_db -c "SELECT COUNT(*) FROM otolith_records WHERE temperature_inferred_celsius IS NOT NULL;"
```

**Verification:** ✓ Temperature inference functional

### Step 5: Anomaly Detection Service
```bash
# Trigger anomaly detection
npm run analytics:anomalies

# Verify results
psql -U postgres -d ratnakara_db -c "SELECT COUNT(*) FROM anomalies;"
```

**Verification:** ✓ Anomalies detected and stored

### Step 6: Frontend Deployment
```bash
cd ../frontend

# Build Next.js app
npm run build

# Start services
npm start

# Verify pages load
curl -s http://localhost:3000/biodiversity | grep -q "Biodiversity Analytics"
```

**Verification:** ✓ Biodiversity page loads

### Step 7: End-to-End Test
```bash
# Run comprehensive test suite
cd backend
bash test-e2e.sh
```

**Verification:** ✓ All tests pass

---

## Post-Deployment Validation

### 1. Data Integrity
```bash
# Check for orphaned records
psql -U postgres -d ratnakara_db -c "
  SELECT COUNT(*) as orphaned_dna FROM dna_sequences
  WHERE occurrenceID IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM occurrences WHERE occurrenceID = dna_sequences.occurrenceID);"

# Verify Darwin Core completeness
psql -U postgres -d ratnakara_db -c "
  SELECT
    (SELECT COUNT(*) FROM occurrences WHERE scientificName IS NULL) as missing_species,
    (SELECT COUNT(*) FROM occurrences WHERE decimalLatitude IS NULL) as missing_latitude,
    (SELECT COUNT(*) FROM occurrences WHERE eventDate IS NULL) as missing_date;"
```

### 2. Performance Baseline
```bash
# Test query performance
time psql -U postgres -d ratnakara_db -c "
  SELECT o.scientificName, COUNT(*) as count
  FROM occurrences o
  GROUP BY o.scientificName
  ORDER BY count DESC LIMIT 20;"

# Monitor connection pool
psql -U postgres -d ratnakara_db -c "
  SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;"
```

### 3. API Endpoint Health
```bash
# Test key endpoints
curl -s http://localhost:5000/api/biodiversity/sequences/stats | jq '.'
curl -s http://localhost:5000/api/analytics/anomalies/stats | jq '.'
curl -s http://localhost:5000/api/analytics/otolith/stats | jq '.'
```

### 4. Frontend Functionality
- [ ] Navigate to http://localhost:3000/biodiversity
- [ ] All KPI cards display values
- [ ] Species richness chart renders
- [ ] eDNA vs Otolith scatter plot displays
- [ ] DNA sequence table searchable
- [ ] Anomaly timeline shows alerts
- [ ] Export to GBIF generates file

### 5. Logging and Monitoring
- [ ] Backend logs accessible: `backend/logs/`
- [ ] No error messages in frontend console
- [ ] Database slow query log empty (or within threshold)
- [ ] Memory usage stable
- [ ] CPU usage acceptable

---

## Rollback Plan

If critical issues encountered:

### Option 1: Restore Previous Database
```bash
# Stop services
pm2 stop all

# Restore backup
psql -U postgres -d ratnakara_db < backup-YYYYMMDD.sql

# Restart services
pm2 start all
```

### Option 2: Schema Rollback
```bash
# If schema needs reversion, create rollback script:
psql -U postgres -d ratnakara_db -f backend/src/db/rollback.sql

# Redeploy previous code
git checkout previous-commit-hash
npm run build
npm start
```

---

## Sign-Off

| Role | Name | Date | Sign-Off |
|------|------|------|----------|
| DBA | ___ | ___ | ☐ |
| Backend Lead | ___ | ___ | ☐ |
| Frontend Lead | ___ | ___ | ☐ |
| QA Lead | ___ | ___ | ☐ |
| Project Manager | ___ | ___ | ☐ |

---

## Post-Deployment Activities

### Day 1 (Deployment Day)
- [ ] Monitor all services for errors
- [ ] Verify data flows correctly
- [ ] Test critical user journeys
- [ ] Document any issues

### Day 2-3 (Stabilization)
- [ ] Performance monitoring (CPU, memory, disk)
- [ ] User acceptance testing
- [ ] Bug fixes for critical issues
- [ ] Documentation updates

### Week 1 (Stabilization)
- [ ] Weekly backup verification
- [ ] Security scanning
- [ ] Load testing baseline
- [ ] Prepare Phase 2 roadmap

### Post-Deployment Monitoring
```bash
# Setup continuous monitoring
# Database replication status
psql -U postgres -d ratnakara_db -c "SELECT * FROM pg_stat_replication;"

# Query performance
psql -U postgres -d ratnakara_db -c "SELECT * FROM pg_stat_statements LIMIT 10;"

# Alert thresholds
# - Database size growth: Alert if > 100GB/week
# - Query latency: Alert if > 5 seconds
# - Error rate: Alert if > 0.1%
```

---

## Known Limitations & Future Work (Phase 2)

### Current Scope (Phase 1)
- ✓ Darwin Core standardization
- ✓ DNA sequence storage
- ✓ Otolith biogeochemistry
- ✓ Anomaly detection (Z-score)
- ✓ Biodiversity visualization
- ⚠ Basic metadata (mock BLAST results)

### Phase 2 Roadmap
- [ ] NetCDF file support for gridded oceanographic data
- [ ] Image storage (specimen photos, satellite imagery)
- [ ] Real BLAST integration for sequence comparison
- [ ] Advanced statistical anomaly detection (Isolation Forest)
- [ ] Real-time WebSocket updates
- [ ] Multi-user collaboration features
- [ ] Advanced analytics (species richness indices, phylogenetic analysis)

---

## Support Contacts

**Technical Issues:**
- Backend: [backend-team@org.com]
- Frontend: [frontend-team@org.com]
- Database: [dba@org.com]

**Business/Questions:**
- Project Lead: [project-lead@org.com]
- Product Owner: [product-owner@org.com]

---

## Version History

| Version | Date | Status | Notes |
|---------|------|--------|-------|
| 1.0 | 2024-03-23 | Draft | Initial Phase 1 MVP |
| | | | |

