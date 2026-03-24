from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import numpy as np
import json
import os
import pickle
from datetime import datetime, timedelta
from pathlib import Path

from models.lstm_model import LSTMPredictor
from models.random_forest import RandomForestPredictor
from models.regression import RegressionPredictor
from services.otolith_classifier import OtolithClassifier

app = FastAPI(
    title="Ratnakara Marine Data ML Service",
    description="AI-powered predictions for marine biodiversity and fisheries",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model directory
MODEL_DIR = os.path.join(os.path.dirname(__file__), 'models', 'saved')
OTOLITH_MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'otolith_model.h5')
OTOLITH_LABELS_PATH = os.path.join(os.path.dirname(__file__), 'models', 'otolith_labels.json')
OTOLITH_EMBEDDING_INDEX_PATH = os.path.join(os.path.dirname(__file__), 'models', 'otolith_embedding_index.npz')

# Initialize predictors
lstm_predictor = LSTMPredictor()
rf_predictor = RandomForestPredictor()
regression_predictor = RegressionPredictor()
otolith_classifier = OtolithClassifier(
    model_path=Path(OTOLITH_MODEL_PATH).resolve(),
    labels_path=Path(OTOLITH_LABELS_PATH).resolve(),
    embedding_index_path=Path(OTOLITH_EMBEDDING_INDEX_PATH).resolve(),
)

# Load trained models if available
def load_trained_models():
    """Load pre-trained models from disk"""
    global rf_predictor, regression_predictor

    # Load Random Forest
    rf_path = os.path.join(MODEL_DIR, 'random_forest.pkl')
    if os.path.exists(rf_path):
        try:
            with open(rf_path, 'rb') as f:
                data = pickle.load(f)
                rf_predictor.model = data['model']
                print(f"Loaded Random Forest model from {rf_path}")
        except Exception as e:
            print(f"Failed to load Random Forest: {e}")

    # Load Linear Regression
    lr_path = os.path.join(MODEL_DIR, 'linear_regression.pkl')
    if os.path.exists(lr_path):
        try:
            with open(lr_path, 'rb') as f:
                data = pickle.load(f)
                regression_predictor.model = data['model']
                regression_predictor.scaler = data.get('scaler')
                print(f"Loaded Linear Regression model from {lr_path}")
        except Exception as e:
            print(f"Failed to load Linear Regression: {e}")

# Load models on startup
load_trained_models()

# Chatbot knowledge base
CHATBOT_KB = {
    "what is edna": "eDNA (environmental DNA) is genetic material shed by organisms into their environment. It's collected from water samples and used for non-invasive biodiversity monitoring and species detection.",
    "ocean acidification": "Ocean acidification is the ongoing decrease in ocean pH caused by absorption of CO2 from the atmosphere. It affects shell formation in marine organisms and threatens coral reefs.",
    "fish abundance": "Fish abundance is affected by temperature, salinity, oxygen levels, food availability, predation, and human activities like fishing. Environmental factors play a crucial role in population dynamics.",
    "salinity": "Salinity measures the concentration of dissolved salts in water (PSU). It influences osmoregulation, buoyancy, and habitat suitability. Indian Ocean salinity typically ranges from 32-37 PSU.",
    "temperature": "Water temperature affects metabolic rates, oxygen solubility, and species distribution. Indian coastal waters typically range from 24-32°C.",
    "dissolved oxygen": "Dissolved oxygen is essential for marine life respiration. Levels below 4 mg/L can cause hypoxia and mass mortality. Optimal range is 4.5-8.5 mg/L.",
    "ph level": "pH measures acidity/alkalinity. Healthy marine ecosystems maintain pH between 7.8-8.3. Lower pH indicates ocean acidification.",
    "biomass": "Biomass is the total mass of living organisms in an area (kg). It indicates ecosystem productivity and fishery potential.",
    "diversity index": "Diversity index measures species richness and evenness (0-1 scale). Higher values indicate healthier, more resilient ecosystems.",
    "correlation": "Correlation coefficient measures linear relationship between variables (-1 to +1). Values >0.7 show strong correlation, 0.4-0.7 moderate, <0.4 weak.",
    "lstm": "LSTM (Long Short-Term Memory) neural networks predict time-series data. Used here to forecast fish populations based on historical patterns.",
    "forecasting": "Forecasting uses machine learning to predict future fish populations, helping with sustainable fishery management and conservation planning.",
    "taxonomy": "Taxonomy is the hierarchical classification of organisms: Kingdom > Phylum > Class > Order > Family > Genus > Species.",
    "species": "Species is the most specific taxonomic rank. Each species has a unique binomial name (e.g., Sardinella longiceps).",
    "monsoon": "Monsoon season shows highest oceanographic variability in Indian waters, affecting fish migration, breeding cycles, and nutrient distribution.",
    "overfishing": "Overfishing depletes fish stocks faster than they can reproduce, threatening marine ecosystems and food security. Sustainable management is crucial.",
    "marine ecosystem": "Marine ecosystems are interconnected communities of organisms and their environment, including coral reefs, open ocean, and coastal zones.",
    "sustainable fisheries": "Sustainable fisheries balance fish harvesting with population regeneration, ensuring long-term viability and ecosystem health.",
}

class PredictionRequest(BaseModel):
    species: str
    months: int

class ClassificationRequest(BaseModel):
    temperature: float
    salinity: float
    ph: float
    oxygen: float

class RegressionRequest(BaseModel):
    data: List[dict]

class ChatbotRequest(BaseModel):
    question: str

@app.get("/")
def root():
    return {"status": "Marine Data ML Service Running", "version": "1.0.0"}

@app.post("/predict/lstm")
async def predict_lstm(request: PredictionRequest):
    try:
        predictions = lstm_predictor.predict(request.species, request.months)

        result = []
        base_date = datetime.now()

        for i, pred in enumerate(predictions):
            forecast_date = base_date + timedelta(days=30 * (i + 1))
            result.append({
                "date": forecast_date.strftime("%Y-%m-%d"),
                "predicted_abundance": int(pred),
                "confidence_low": int(pred * 0.85),
                "confidence_high": int(pred * 1.15),
            })

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/random-forest")
async def predict_random_forest(request: ClassificationRequest):
    try:
        features = np.array([[
            request.temperature,
            request.salinity,
            request.ph,
            request.oxygen
        ]])

        prediction = rf_predictor.predict(features)

        return {
            "abundance_category": prediction[0],
            "features": {
                "temperature": request.temperature,
                "salinity": request.salinity,
                "ph": request.ph,
                "oxygen": request.oxygen,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/regression")
async def predict_regression(request: RegressionRequest):
    try:
        predictions = regression_predictor.predict(request.data)

        return {
            "predictions": predictions,
            "model": "linear_regression"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/otolith")
async def predict_otolith(image: UploadFile = File(...)):
    if image.content_type not in {"image/jpeg", "image/jpg", "image/png", "image/webp"}:
        raise HTTPException(status_code=400, detail="Unsupported image format")

    try:
        image_bytes = await image.read()
        result = otolith_classifier.predict(image_bytes)
        return {
            "species": result["species"],
            "confidence": result["confidence"],
        }
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Otolith prediction failed: {e}")

@app.post("/chatbot")
async def chatbot(request: ChatbotRequest):
    question = request.question.lower().strip()

    # Simple keyword matching
    best_match = None
    best_score = 0

    for key, answer in CHATBOT_KB.items():
        score = sum(1 for word in key.split() if word in question)
        if score > best_score:
            best_score = score
            best_match = answer

    if best_match and best_score > 0:
        return {"answer": best_match}

    return {
        "answer": "I don't have specific information about that. Try asking about: eDNA, ocean acidification, fish abundance, salinity, temperature, dissolved oxygen, pH, biomass, diversity, or forecasting."
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
