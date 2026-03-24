# Marine Data Platform (Database-Free)

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+ (optional, only for pipeline/ml experiments)

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Open App
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## What Changed

This project now runs in **database-free mode**.

- No PostgreSQL setup
- No DATABASE_URL required
- No schema initialization
- No seed step

The backend serves local in-memory marine datasets through the same API routes used by the frontend.

## Architecture

```text
Next.js Frontend
      |
      v
Express API (local in-memory data)
```

## Main API Groups

- `/api/ocean`
- `/api/fisheries`
- `/api/edna`
- `/api/taxonomy`
- `/api/correlation`
- `/api/forecast`
- `/api/geo`
- `/api/insights`
- `/api/biodiversity`
- `/api/alerts`

## Notes

- The UI remains interactive and presentation-ready for students.
- Data is deterministic demo data generated in backend memory.
- To customize datasets, edit `backend/src/routes/localApi.ts`.
