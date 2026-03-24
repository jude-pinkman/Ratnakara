"""
Deep eDNA Shape Analyzer - Python ML Service
FastAPI backend for DNA shape prediction using deep learning
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import numpy as np
import torch
import torch.nn as nn
from datetime import datetime
import logging
import time
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI app
app = FastAPI(
    title="Deep eDNA Shape Analyzer",
    description="ML service for DNA structural shape prediction",
    version="1.0.0"
)

# ============================================================================
# MODELS & SCHEMAS
# ============================================================================

class PredictRequest(BaseModel):
    """Request model for shape prediction"""
    sequence: str
    feature: str = "MGW"
    enable_fl: bool = False
    deep_layer: int = 4


class CompareRequest(BaseModel):
    """Request model for sequence comparison"""
    sequence1: str
    sequence2: str
    feature: str = "MGW"


class SpeciesInsightRequest(BaseModel):
    """Request model for species prediction"""
    sequence: str
    shapes: Optional[Dict[str, List[float]]] = None


class EcologicalAnalysisRequest(BaseModel):
    """Request model for ecological analysis"""
    sequences: List[str]


class PredictionData(BaseModel):
    """Single prediction point"""
    position: int
    base: str
    value: float


class Statistics(BaseModel):
    """Statistics of predictions"""
    min: float
    max: float
    mean: float
    std: float


class PredictionResponse(BaseModel):
    """Response model for predictions"""
    predictions: List[PredictionData]
    statistics: Statistics
    processing_time_ms: float


# ============================================================================
# DNA SHAPE NEURAL NETWORK MODEL
# ============================================================================

class DNAShapeNet(nn.Module):
    """
    Deep learning model for DNA shape prediction
    Architecture:
    - One-hot encoded input (4 channels)
    - Convolutional layers with increasingly deep context
    - Fully connected output layers
    - Predicts shape values per nucleotide position
    """

    def __init__(self, num_layers: int = 4, sequence_length: int = 1000):
        super(DNAShapeNet, self).__init__()
        self.num_layers = num_layers
        self.sequence_length = sequence_length

        # Embedding through convolutions
        self.layers = nn.ModuleList()

        # Layer 1: Small receptive field (3bp window)
        self.layers.append(
            nn.Sequential(
                nn.Conv1d(4, 32, kernel_size=3, padding=1),
                nn.ReLU(),
                nn.BatchNorm1d(32),
            )
        )

        # Layer 2-N: Increasing receptive field
        for i in range(1, num_layers):
            kernel_size = 2 * i + 1  # 3, 5, 7, 9
            self.layers.append(
                nn.Sequential(
                    nn.Conv1d(32, 32, kernel_size=kernel_size, padding=kernel_size // 2),
                    nn.ReLU(),
                    nn.BatchNorm1d(32),
                )
            )

        # Output layers
        self.fc_layers = nn.Sequential(
            nn.Linear(32, 16),
            nn.ReLU(),
            nn.Dropout(0.1),
            nn.Linear(16, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Forward pass
        Args:
            x: (batch_size, 4, sequence_length) one-hot encoded DNA
        Returns:
            predictions: (batch_size, sequence_length, 1)
        """
        # Apply convolutional layers
        for layer in self.layers:
            x = layer(x)

        # Transpose for FC layers (batch, length, channels)
        x = x.transpose(1, 2)

        # Apply FC layers to each position
        predictions = []
        for t in range(x.size(1)):
            out = self.fc_layers(x[:, t, :])
            predictions.append(out)

        predictions = torch.stack(predictions, dim=1)  # (batch, length, 1)
        return predictions.squeeze(-1)  # (batch, length)


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def one_hot_encode(sequence: str) -> np.ndarray:
    """
    Convert DNA sequence to one-hot encoding
    Args:
        sequence: DNA sequence string (ACGTN)
    Returns:
        one-hot encoded array (4, length)
    """
    mapping = {"A": 0, "C": 1, "G": 2, "T": 3, "N": 4}
    length = len(sequence)

    # Use 4 channels (A, C, G, T) - N is ambiguous, treat as neutral
    encoded = np.zeros((4, length), dtype=np.float32)

    for i, base in enumerate(sequence):
        if base in mapping:
            idx = mapping[base]
            if idx < 4:  # Skip N
                encoded[idx, i] = 1.0
            else:  # N gets equal probability
                encoded[:, i] = 0.25

    return encoded


def predict_shape_pentamer_lookup(sequence: str, feature: str) -> np.ndarray:
    """
    Fallback: Pentamer-based shape prediction using lookup table logic
    (Similar to DNAshapeR approach)
    Args:
        sequence: DNA sequence
        feature: Shape feature name
    Returns:
        predicted shape values per position
    """
    # Pentamer shape lookup table (simplified)
    pentamer_table = {
        "MGW": {
            "AAAAA": 6.5, "AAAAC": 5.2, "AAAAT": 5.1, "AAAAG": 5.8,
            "CCCCG": 4.2, "TTTTA": 5.3, "GGGGC": 6.1, "CGCGC": 6.9,
            "AATTC": 5.6, "CGGCC": 5.2, "TAAAA": 5.1,
        },
        "EP": {
            "AAAAA": -0.5, "CCCCG": -0.8, "GGGGC": -0.6, "CGCGC": -0.4,
        },
        "Shift": {
            "AAAAA": -0.1, "CCCCG": 0.2, "GGGGC": 0.15, "CGCGC": -0.05,
        },
        "Slide": {
            "AAAAA": 0.3, "CCCCG": -0.4, "GGGGC": 0.2, "CGCGC": 0.0,
        },
        "Rise": {
            "AAAAA": 3.35, "CCCCG": 3.25, "GGGGC": 3.30, "CGCGC": 3.38,
        },
        "Tilt": {
            "AAAAA": -0.2, "CCCCG": 0.5, "GGGGC": 0.1, "CGCGC": -0.3,
        },
        "Roll": {
            "AAAAA": 0.0, "CCCCG": -5.0, "GGGGC": -4.5, "CGCGC": -8.5,
        },
        "HelT": {
            "AAAAA": 35.0, "CCCCG": 32.0, "GGGGC": 34.5, "CGCGC": 30.5,
        },
    }

    predictions = []
    window = 5

    for i in range(len(sequence)):
        # Get pentamer window centered on position i
        start = max(0, i - window // 2)
        end = min(len(sequence), i + window // 2 + 1)
        pent = sequence[start:end]

        # Look up or estimate value
        if feature in pentamer_table:
            value = pentamer_table[feature].get(pent, 0.0)
            # Add some noise based on position variance
            value += np.random.normal(0, 0.1)
        else:
            # Default values based on feature type
            if feature == "MGW":
                value = np.random.normal(5.5, 0.8)  # MGW typically 3-8
            elif "Shift" in feature or "Slide" in feature:
                value = np.random.normal(0.0, 0.3)
            elif "Rise" in feature:
                value = np.random.normal(3.3, 0.05)
            else:
                value = np.random.normal(0.0, 1.0)

        predictions.append(value)

    return np.array(predictions, dtype=np.float32)


def predict_shape_neural(sequence: str, feature: str, model: DNAShapeNet, device) -> np.ndarray:
    """
    Predict shape using neural network
    """
    # One-hot encode
    encoded = one_hot_encode(sequence)

    # Pad or truncate to model input size
    max_len = 1000
    if encoded.shape[1] < max_len:
        padded = np.zeros((4, max_len), dtype=np.float32)
        padded[:, : encoded.shape[1]] = encoded
        encoded = padded
    else:
        encoded = encoded[:, :max_len]

    # Convert to tensor
    x = torch.FloatTensor(encoded).unsqueeze(0).to(device)  # (1, 4, max_len)

    # Predict
    with torch.no_grad():
        output = model(x)

    # Get predictions for actual sequence length
    predictions = output[0, : len(sequence)].cpu().numpy()

    # Normalize based on feature
    if feature == "MGW":
        predictions = 3.0 + predictions * 3.5  # MGW range: 3-8
    elif feature == "EP":
        predictions = -0.5 + predictions * 0.75  # EP range: -1 to 0
    elif "Rise" in feature:
        predictions = 3.3 + predictions * 0.1  # Rise: ~3.3
    elif "HelT" in feature:
        predictions = 34.0 + predictions * 4.0  # Helical twist: ~34

    return predictions


def calculate_statistics(predictions: np.ndarray) -> Dict[str, float]:
    """Calculate statistics for predictions"""
    return {
        "min": float(np.min(predictions)),
        "max": float(np.max(predictions)),
        "mean": float(np.mean(predictions)),
        "std": float(np.std(predictions)),
    }


# ============================================================================
# GLOBAL MODEL INITIALIZATION
# ============================================================================

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
logger.info(f"Using device: {device}")

# Initialize model
shape_model = DNAShapeNet(num_layers=4).to(device)
shape_model.eval()  # Set to evaluation mode

logger.info("Deep eDNA Shape Model initialized")


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "Deep eDNA Shape Analyzer",
        "device": str(device),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/shape/predict", response_model=PredictionResponse)
async def predict_shape(request: PredictRequest):
    """
    Predict DNA shape features for a single sequence
    """
    start_time = time.time()

    try:
        sequence = request.sequence.upper().replace(" ", "")

        if not sequence or len(sequence) < 5:
            raise HTTPException(status_code=400, detail="Sequence too short (min 5 bases)")

        if not all(base in "ACGTN" for base in sequence):
            raise HTTPException(status_code=400, detail="Invalid DNA bases")

        # Predict shape
        predictions = predict_shape_neural(
            sequence, request.feature, shape_model, device
        )

        # Add shape fluctuation if enabled
        if request.enable_fl:
            fl_values = np.abs(np.random.normal(0, 0.15, len(predictions)))
            predictions = predictions * (1 + fl_values)

        # Build response
        stats = calculate_statistics(predictions)
        pred_data = [
            {"position": i + 1, "base": sequence[i], "value": float(predictions[i])}
            for i in range(len(sequence))
        ]

        processing_time = (time.time() - start_time) * 1000

        return PredictionResponse(
            predictions=pred_data,
            statistics=Statistics(**stats),
            processing_time_ms=processing_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/shape/compare")
async def compare_sequences(request: CompareRequest):
    """
    Compare DNA shape features between two sequences
    """
    start_time = time.time()

    try:
        seq1 = request.sequence1.upper().replace(" ", "")
        seq2 = request.sequence2.upper().replace(" ", "")

        if not all(base in "ACGTN" for base in seq1 + seq2):
            raise HTTPException(status_code=400, detail="Invalid DNA bases")

        # Predict for both
        pred1 = predict_shape_neural(seq1, request.feature, shape_model, device)
        pred2 = predict_shape_neural(seq2, request.feature, shape_model, device)

        # Align sequences (simple padding)
        max_len = max(len(seq1), len(seq2))
        pred1_padded = np.pad(pred1, (0, max_len - len(pred1)), constant_values=0)
        pred2_padded = np.pad(pred2, (0, max_len - len(seq2)), constant_values=0)

        # Calculate difference
        difference = [
            {
                "position": i + 1,
                "value1": float(pred1_padded[i]),
                "value2": float(pred2_padded[i]),
                "diff": float(pred1_padded[i] - pred2_padded[i]),
            }
            for i in range(max_len)
        ]

        # Calculate similarity
        valid_mask = (pred1_padded != 0) | (pred2_padded != 0)
        if np.any(valid_mask):
            correlation = np.corrcoef(pred1_padded[valid_mask], pred2_padded[valid_mask])[0, 1]
            similarity = float(np.clip(correlation, 0, 1))
        else:
            similarity = 0.0

        processing_time = (time.time() - start_time) * 1000

        return {
            "difference": difference,
            "similarity": similarity,
            "processing_time_ms": processing_time,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Comparison error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/shape/species-insight")
async def species_insight(request: SpeciesInsightRequest):
    """
    Predict species likelihood from DNA shape features
    Uses Random Forest-like logic
    """
    try:
        sequence = request.sequence.upper().replace(" ", "")

        # Predict shapes for key features
        features_to_predict = ["MGW", "Shift", "Rise", "Roll", "HelT"]
        shape_profiles = {}

        for feature in features_to_predict:
            pred = predict_shape_neural(sequence, feature, shape_model, device)
            shape_profiles[feature] = {
                "mean": float(np.mean(pred)),
                "std": float(np.std(pred)),
                "min": float(np.min(pred)),
                "max": float(np.max(pred)),
            }

        # Species prediction (simplified logic)
        # In production, this would use a trained classifier
        species_predictions = predict_species_from_shapes(shape_profiles)

        return {
            "species_predictions": species_predictions,
            "ecological_signals": {
                "gc_content": float((sequence.count("G") + sequence.count("C")) / len(sequence)),
                "at_content": float((sequence.count("A") + sequence.count("T")) / len(sequence)),
                "sequence_length": len(sequence),
            },
            "confidence": 0.75,
        }

    except Exception as e:
        logger.error(f"Species insight error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/shape/ecological-analysis")
async def ecological_analysis(request: EcologicalAnalysisRequest):
    """
    Analyze ecological diversity from multiple sequences
    """
    try:
        sequences = request.sequences

        if not sequences:
            raise HTTPException(status_code=400, detail="No sequences provided")

        # Calculate diversity metrics
        species_detected = {}
        shape_profiles = []

        for seq in sequences:
            seq = seq.upper().replace(" ", "")
            if len(seq) >= 5:
                pred = predict_shape_neural(seq, "MGW", shape_model, device)
                shape_profiles.append(pred)

                # Simple species detection based on GC content
                gc_ratio = (seq.count("G") + seq.count("C")) / len(seq)
                species_key = f"GC{int(gc_ratio * 100)}"
                species_detected[species_key] = species_detected.get(species_key, 0) + 1

        # Calculate diversity index (Shannon)
        if species_detected:
            total = sum(species_detected.values())
            probabilities = [count / total for count in species_detected.values()]
            shannon_index = -sum(p * np.log(p) if p > 0 else 0 for p in probabilities)
        else:
            shannon_index = 0.0

        return {
            "biodiversity_richness": len(species_detected),
            "dominant_species": max(species_detected, key=species_detected.get) or "Unknown",
            "anomalies": [],  # Placeholder
            "diversity_index": float(shannon_index),
            "species_detected": species_detected,
            "total_sequences": len(sequences),
        }

    except Exception as e:
        logger.error(f"Ecological analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def predict_species_from_shapes(shape_profiles: Dict) -> List[Dict]:
    """
    Predict species from shape profiles using heuristic rules
    In production, use a trained classifier (Random Forest, NN, etc.)
    """
    species_candidates = [
        {"species": "Rastrelliger kanagurta", "confidence": 0.45, "common_name": "Indian Mackerel"},
        {"species": "Sardinella longiceps", "confidence": 0.25, "common_name": "Indian Oil Sardine"},
        {"species": "Thunnus albacares", "confidence": 0.18, "common_name": "Yellowfin Tuna"},
        {"species": "Unknown", "confidence": 0.12, "common_name": "Unidentified"},
    ]

    # Adjust based on shape profiles
    mgw_mean = shape_profiles.get("MGW", {}).get("mean", 5.5)
    rise_mean = shape_profiles.get("Rise", {}).get("mean", 3.3)

    # Simple heuristic
    if mgw_mean > 6.0:
        species_candidates[0]["confidence"] += 0.1
    if rise_mean < 3.25:
        species_candidates[1]["confidence"] += 0.1

    # Normalize
    total_conf = sum(s["confidence"] for s in species_candidates)
    for spec in species_candidates:
        spec["confidence"] /= total_conf

    return sorted(species_candidates, key=lambda x: x["confidence"], reverse=True)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
