# AI-Driven Unified Marine Data Platform

A comprehensive full-stack platform integrating oceanographic data, fisheries monitoring, eDNA biodiversity analysis, taxonomy classification, and AI-powered analytics.

## Technology Stack

### Frontend
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- Chart.js & Recharts
- Leaflet.js (Maps)

### Backend
- Node.js + Express
- TypeScript
- PostgreSQL

### ML/AI
- Python 3.10+
- FastAPI
- TensorFlow/Keras (LSTM)
- scikit-learn (Random Forest, Regression)

## Features

1. **Ocean Data Module** - Temperature, salinity, pH, oxygen monitoring with KPIs and trend analysis
2. **Fisheries Module** - Fish abundance, biomass, diversity tracking with geospatial mapping
3. **eDNA Module** - Environmental DNA analysis with concentration trends and confidence metrics
4. **Taxonomy Module** - Hierarchical species classification browser
5. **Visualization Dashboard** - Advanced filtering and stacked charts
6. **Correlation Analysis** - Environmental factors vs fish abundance with scatter plots
7. **AI Forecasting** - LSTM-based population predictions
8. **AI Chatbot** - Natural language Q&A system
9. **API Documentation** - Complete REST API reference

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Python 3.10+
- PostgreSQL 14+
- Git

### 1. Database Setup

```bash
# Install PostgreSQL (if not already installed)
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql

# Start PostgreSQL service
# Windows: Start via Services or pgAdmin
# macOS/Linux: sudo service postgresql start

# Create database
psql -U postgres
CREATE DATABASE marine_data;
\q

# Run schema
cd marine-data-platform/backend
psql -U postgres -d marine_data -f src/db/schema.sql
```

### 2. Backend Setup

```bash
cd marine-data-platform/backend

# Copy environment file
cp .env.example .env

# Update .env with your PostgreSQL credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=marine_data
# DB_USER=postgres
# DB_PASSWORD=your_password

# Install dependencies
npm install

# Seed database with synthetic data
npm run seed

# Start backend server
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. ML Service Setup

```bash
cd marine-data-platform/ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create models directory
mkdir -p models/saved

# Train models (optional - models auto-initialize)
python train/train_lstm.py
python train/train_rf.py
python train/train_regression.py

# Start ML service
python main.py
```

ML service will run on `http://localhost:8000`

### 4. Frontend Setup

```bash
cd marine-data-platform/frontend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on `http://localhost:3000`

### 5. Access the Application

Open your browser and navigate to:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **ML Service**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (FastAPI auto-docs)

## Project Structure

```
marine-data-platform/
├── frontend/              # Next.js React application
│   ├── app/              # App router pages
│   ├── components/       # React components
│   └── lib/              # API utilities
├── backend/              # Express API server
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── db/          # Database connection & schema
│   │   └── data/        # Data seeding scripts
└── ml-service/           # Python ML service
    ├── models/          # ML model implementations
    ├── train/           # Training scripts
    └── main.py          # FastAPI application
```

## API Endpoints

### Ocean Data
- `GET /api/ocean` - Retrieve ocean data
- `GET /api/ocean/kpis` - Key performance indicators
- `GET /api/ocean/trends` - Monthly trends
- `GET /api/ocean/geospatial` - Station locations

### Fisheries Data
- `GET /api/fisheries` - Retrieve fisheries data
- `GET /api/fisheries/metrics` - Aggregate metrics
- `GET /api/fisheries/species-distribution` - Species breakdown
- `GET /api/fisheries/temporal` - Time-series data
- `GET /api/fisheries/geospatial` - Fishing zones

### eDNA Data
- `GET /api/edna` - Retrieve eDNA samples
- `GET /api/edna/concentration-trends` - Concentration analysis
- `GET /api/edna/depth-analysis` - Depth vs concentration
- `GET /api/edna/seasonal` - Seasonal patterns
- `GET /api/edna/confidence-distribution` - Confidence metrics

### Taxonomy
- `GET /api/taxonomy` - All taxonomic records
- `GET /api/taxonomy/tree` - Hierarchical tree
- `GET /api/taxonomy/species/:species` - Species details
- `GET /api/taxonomy/search?q={query}` - Search taxonomy

### Correlations
- `GET /api/correlation` - Correlation data
- `GET /api/correlation/environmental-impact` - Coefficient analysis
- `GET /api/correlation/scatter/:variable` - Scatter plot data

### Forecasting
- `GET /api/forecast` - Existing forecasts
- `POST /api/forecast/generate` - Generate predictions

### Chatbot
- `POST /api/chatbot` - Ask questions

## ML Models

### LSTM Forecasting
Predicts future fish populations based on historical time-series data. Uses Long Short-Term Memory neural networks for sequence modeling.

### Random Forest Classification
Classifies abundance levels (low/medium/high) based on environmental parameters (temperature, salinity, pH, oxygen).

### Linear Regression
Predicts exact abundance values from environmental conditions. Calculates environmental impact scenarios.

## Data

Platform includes 180+ geospatial monitoring stations across Indian marine regions:
- Bay of Bengal
- Arabian Sea
- Indian Ocean
- Andaman Sea
- Lakshadweep Sea

Features 15+ marine species including:
- Indian Oil Sardine
- Indian Mackerel
- Yellowfin Tuna
- Giant Tiger Prawn
- Barramundi

## Development

### Backend Development
```bash
cd backend
npm run dev  # Auto-reload on changes
```

### Frontend Development
```bash
cd frontend
npm run dev  # Hot reload enabled
```

### ML Service Development
```bash
cd ml-service
uvicorn main:app --reload
```

## Production Build

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

### ML Service
```bash
cd ml-service
uvicorn main:app --host 0.0.0.0 --port 8000
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env`
- Ensure database `marine_data` exists

### Port Already in Use
- Backend: Change `PORT` in `.env`
- Frontend: Use `PORT=3001 npm run dev`
- ML Service: `uvicorn main:app --port 8001`

### Missing Dependencies
```bash
# Backend/Frontend
npm install

# ML Service
pip install -r requirements.txt
```

### Leaflet Map Not Displaying
- Check browser console for errors
- Ensure Leaflet CSS is loaded
- Verify geospatial data is populated

## License

MIT License

## Contact

For issues and questions, create an issue in the project repository.
