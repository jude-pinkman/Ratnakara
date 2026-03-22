# System Architecture

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER BROWSER                         │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTP
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)                          │
│                  Port: 3000                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Pages   │  │Components│  │  Charts  │  │   Maps   │   │
│  │ (10)     │  │  (12+)   │  │(Chart.js)│  │(Leaflet) │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└───────────────────┬─────────────────────┬───────────────────┘
                    │ REST API            │ REST API
                    ▼                     ▼
    ┌───────────────────────┐     ┌──────────────────────┐
    │  BACKEND (Express)    │     │  ML SERVICE         │
    │  Port: 3001           │     │  (FastAPI)          │
    │  ┌─────────────────┐  │     │  Port: 8000         │
    │  │  API Routes     │  │     │  ┌────────────────┐ │
    │  │  - Ocean        │  │     │  │ LSTM Model     │ │
    │  │  - Fisheries    │  │     │  │ Random Forest  │ │
    │  │  - eDNA         │  │     │  │ Regression     │ │
    │  │  - Taxonomy     │  │     │  │ Chatbot        │ │
    │  │  - Correlation  │  │     │  └────────────────┘ │
    │  │  - Forecast     │  │     │                      │
    │  └─────────────────┘  │     └──────────────────────┘
    └───────────┬───────────┘
                │ SQL Queries
                ▼
    ┌───────────────────────┐
    │  DATABASE (PostgreSQL)│
    │  Port: 5432           │
    │  ┌─────────────────┐  │
    │  │ ocean_data      │  │
    │  │ fisheries_data  │  │
    │  │ edna_data       │  │
    │  │ taxonomy        │  │
    │  │ correlations    │  │
    │  │ forecasts       │  │
    │  │ chatbot_logs    │  │
    │  └─────────────────┘  │
    └───────────────────────┘
```

## Data Flow

### 1. User Views Ocean Data
```
User → Frontend → Backend → PostgreSQL
                            ↓
                    (ocean_data table)
                            ↓
                    Process & Aggregate
                            ↓
Backend → Frontend → Charts/Maps/KPIs → User
```

### 2. User Requests AI Forecast
```
User → Frontend → ML Service
                    ↓
                LSTM Model
                    ↓
            Generate Predictions
                    ↓
ML Service → Backend → PostgreSQL (store)
                    ↓
Backend → Frontend → Display Chart → User
```

### 3. User Asks Chatbot Question
```
User → Frontend → Backend → ML Service
                                ↓
                        Chatbot KB Search
                                ↓
                        Generate Answer
                                ↓
ML Service → Backend → Frontend → Display → User
```

## Component Structure

### Frontend Architecture
```
app/
├── page.tsx (Landing)
├── layout.tsx (Root)
├── dashboard/
│   └── page.tsx
├── ocean/
│   └── page.tsx
├── fisheries/
│   └── page.tsx
├── edna/
│   └── page.tsx
├── taxonomy/
│   └── page.tsx
├── visualization/
│   └── page.tsx
├── correlations/
│   └── page.tsx
├── terminology/
│   └── page.tsx
└── api-docs/
    └── page.tsx

components/
├── Navigation.tsx
├── StatsCard.tsx
├── OceanKPIs.tsx
├── MapView.tsx
├── TaxonomyTree.tsx
├── CorrelationChart.tsx
└── Chatbot.tsx
```

### Backend Architecture
```
src/
├── app.ts (Express server)
├── db/
│   ├── connection.ts
│   └── schema.sql
├── routes/
│   ├── ocean.ts
│   ├── fisheries.ts
│   ├── edna.ts
│   ├── taxonomy.ts
│   ├── correlation.ts
│   └── forecast.ts
└── data/
    └── seed.ts
```

### ML Service Architecture
```
ml-service/
├── main.py (FastAPI)
├── models/
│   ├── lstm_model.py
│   ├── random_forest.py
│   └── regression.py
└── train/
    ├── train_lstm.py
    ├── train_rf.py
    └── train_regression.py
```

## Technology Stack

```
┌─────────────────────────────────────────┐
│           PRESENTATION LAYER             │
│  Next.js 14 | React 18 | TypeScript     │
│  Tailwind CSS | Chart.js | Leaflet      │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│          APPLICATION LAYER               │
│  Express | Node.js | TypeScript          │
│  FastAPI | Python | uvicorn              │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│             DATA LAYER                   │
│  PostgreSQL 14+ | pg driver              │
│  Connection Pooling | Indexing           │
└─────────────────────────────────────────┘
                    ↕
┌─────────────────────────────────────────┐
│          INTELLIGENCE LAYER              │
│  TensorFlow | scikit-learn | NumPy      │
│  LSTM | Random Forest | Regression       │
└─────────────────────────────────────────┘
```

## Deployment Architecture

```
┌────────────────────────────────────────────────┐
│              LOAD BALANCER (Nginx)             │
│              Port 80/443 (HTTPS)               │
└────────────────┬───────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐  ┌──────────────┐
│  Frontend    │  │   Backend    │
│  Instance 1  │  │   Instance 1 │
│              │  │              │
│  Frontend    │  │   Backend    │
│  Instance 2  │  │   Instance 2 │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                ┌─────────────────┐
                │   PostgreSQL    │
                │   Primary       │
                │        ↕        │
                │   PostgreSQL    │
                │   Replica       │
                └─────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────┐
│  1. SSL/TLS Encryption (HTTPS)          │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  2. CORS Configuration                   │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  3. Rate Limiting (API)                  │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  4. Input Validation & Sanitization      │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  5. Environment Variables Protection     │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  6. Database Connection Pooling          │
└─────────────────────────────────────────┘
```

## Monitoring & Logging

```
Application Logs
    ↓
┌─────────────────┐
│  PM2 Process    │
│  Manager        │
└─────────────────┘
    ↓
┌─────────────────┐
│  Winston Logger │
│  (Backend)      │
└─────────────────┘
    ↓
┌─────────────────┐
│  Log Files      │
│  - error.log    │
│  - combined.log │
└─────────────────┘
```

## Performance Optimization

```
┌──────────────────────────────────────┐
│  1. Database Indexing                │
│     - Spatial indexes                │
│     - Date indexes                   │
│     - Foreign key indexes            │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  2. Connection Pooling               │
│     - 20 max connections             │
│     - 30s idle timeout               │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  3. Frontend Optimization            │
│     - Code splitting                 │
│     - Image optimization             │
│     - Lazy loading                   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│  4. API Response Caching             │
│     - Redis (optional)               │
│     - In-memory caching              │
└──────────────────────────────────────┘
```

## Scalability Strategy

### Horizontal Scaling
```
Frontend: Multiple Next.js instances
Backend: Multiple Express instances
Database: Primary-Replica replication
ML Service: Multiple FastAPI workers
```

### Vertical Scaling
```
Increase server resources
Optimize database queries
Enhance caching mechanisms
```
