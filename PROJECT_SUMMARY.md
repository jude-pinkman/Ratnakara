# PROJECT SUMMARY

## Ratnakara: Database-Free Marine Analytics Platform

### Delivered State

- Backend now runs with **local in-memory datasets**.
- External database dependency has been removed from app startup.
- Frontend pages continue using the same API contracts.
- Explorer, Biodiversity, Dashboard, Ocean, Fisheries, eDNA, Taxonomy, and Correlations continue to function with local data.

## Backend Runtime Mode

- API server: `backend/src/app.ts`
- Local API routes: `backend/src/routes/localApi.ts`
- Health endpoint reports:
  - `dataSource: local-in-memory`
  - `database: removed`

## API Coverage (Local Data)

- Ocean: KPIs, trends, geospatial
- Fisheries: metrics, species distribution, temporal, geospatial
- eDNA: trends, depth, seasonal, confidence, species list, stats
- Taxonomy: all, tree, search, stats
- Correlations: matrix, scatter, species list
- Forecast: list, species list, generate
- Geospatial: clusters, point details, heatmap, regions, search
- Biodiversity: sequences, anomalies, richness, comparison, KPIs, genes, Darwin Core export, risk index
- Alerts: active, summary, acknowledge
- Insights: generate and summary endpoints

## Why This Mode

- Simpler for first-year student demos
- No database setup friction
- Fast local startup for classroom presentations
- Stable, predictable outputs for evaluation

## Run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```
