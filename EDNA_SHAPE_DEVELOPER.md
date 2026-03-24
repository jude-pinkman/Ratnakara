# Deep eDNA Shape Analyzer - Developer Reference

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                             │
│                  (Next.js Frontend)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /edna-shape-analyzer Page                          │   │
│  │  • DNA Sequence Input                               │   │
│  │  • Feature Selection (14 shape features)            │   │
│  │  • Result Graphs & Tables                           │   │
│  │  • Export to CSV                                    │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/JSON
┌────────────────▼────────────────────────────────────────────┐
│                   API LAYER                                 │
│              (Express.js Backend)                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /api/edna-shape Routes (ednaShapeAnalyzer.ts)     │   │
│  │                                                     │   │
│  │  POST /predict          ← Single sequence analysis │   │
│  │  POST /compare          ← Compare two sequences    │   │
│  │  POST /batch-predict    ← Bulk file processing     │   │
│  │  POST /species-insight  ← Species detection        │   │
│  │  POST /ecological-analysis ← Diversity metrics     │   │
│  │  GET  /health           ← Status check             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/JSON (port 8000)
┌────────────────▼────────────────────────────────────────────┐
│              ML SERVICE LAYER                               │
│         (FastAPI Python Service)                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  edna_shape.py                                      │   │
│  │  • DNA Validation & One-hot Encoding               │   │
│  │  • Neural Network Inference                        │   │
│  │  • Pentamer Lookup (fallback)                      │   │
│  │  • Species Prediction                              │   │
│  │  • Ecological Analysis                             │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────────────┐
│              ML MODEL LAYER                                 │
│          (PyTorch Neural Networks)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  DNAShapeNet Class                                  │   │
│  │  • Convolutional layers (2-5 depth)                │   │
│  │  • Receptive field: 3-9 nucleotides                │   │
│  │  • Output: Shape value per position                │   │
│  │                                                     │   │
│  │  Prediction Models:                                 │   │
│  │  • Neural Network (preferred)                      │   │
│  │  • Pentamer Lookup (fallback)                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 File Structure

```
Ratnakara/
├── frontend/
│   └── app/
│       └── edna-shape-analyzer/
│           └── page.tsx              # Main UI component
│
├── backend/
│   ├── src/
│   │   ├── app.ts                    # UPDATED: Mount routes
│   │   └── routes/
│   │       └── ednaShapeAnalyzer.ts  # Express routes (500+ lines)
│   ├── uploads/
│   │   └── edna/                     # Temp file storage
│   └── package.json                  # UPDATED: Add multer, sharp
│
├── ml-service/
│   ├── edna_shape.py                 # FastAPI app (600+ lines)
│   ├── requirements_edna_shape.txt    # Python dependencies
│   └── Dockerfile.edna_shape          # Container config
│
└── Documentation/
    ├── EDNA_SHAPE_SETUP.md            # Installation guide
    └── EDNA_SHAPE_DEVELOPER.md        # This file
```

---

## 🔧 API Reference

### Input Validation

All endpoints validate DNA sequences:
- **Allowed characters:** A, C, G, T, N
- **Minimum length:** 5 bases
- **Maximum length:** 10,000 bases
- **Case:** Auto-converted to uppercase

### Response Format

**Standard Success Response:**
```json
{
  "success": true,
  "data": {...},
  "processingTimeMs": 245,
  "timestamp": "2026-03-24T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description",
  "timestamp": "2026-03-24T10:30:00.000Z"
}
```

---

## 🧬 DNA Shape Features Explained

### Groove Features
- **MGW (Minor Groove Width):** Distance between phosphate backbones
  - Range: 3-8 Å
  - Lower MGW = tighter binding

- **EP (Electrostatic Potential):** Charge distribution
  - Range: -1 to 0 mV
  - Negative = more electron-rich

### Intra-base-pair Features
- **Shear:** Lateral sliding of bases
  - Range: -2 to +2 Å
- **Stretch:** Base pair separation
  - Range: -0.5 to +0.5 Å
- **Stagger:** Vertical offset
  - Range: -0.5 to +0.5 Å
- **Buckle:** Rotation around base pair long axis
  - Range: -30 to +30°
- **ProT (Propeller Twist):** Twist angle
  - Range: -30 to +30°
- **Opening:** Base pair separation distance
  - Range: 0-5 Å

### Inter-base-pair Features
- **Shift:** XY translation
  - Range: -3 to +3 Å
- **Slide:** Relative movement along helical axis
  - Range: -5 to +5 Å
- **Rise:** Vertical spacing per base pair
  - Range: 3.0-3.5 Å
- **Tilt:** Base pair rotation angle
  - Range: -30 to +30°
- **Roll:** Lateral bending angle
  - Range: -30 to +30°
- **HelT (Helical Twist):** Rotation angle
  - Range: 30-40°

---

## 🎯 ML Model Details

### DNAShapeNet Architecture

```
Input: One-hot encoded DNA sequence
Size: (batch_size, 4 channels, sequence_length)

Layer 1: Conv1d(4 → 32, kernel=3, padding=1)
         └─ ReLU + BatchNorm
         └─ Receptive field: 3 bp

Layer 2: Conv1d(32 → 32, kernel=5, padding=2)
         └─ ReLU + BatchNorm
         └─ Receptive field: 5 bp

Layer 3: Conv1d(32 → 32, kernel=7, padding=3)
         └─ ReLU + BatchNorm
         └─ Receptive field: 7 bp

Layer 4: Conv1d(32 → 32, kernel=9, padding=4)
         └─ ReLU + BatchNorm
         └─ Receptive field: 9 bp

(Optional Layer 5: Conv1d(32 → 32, kernel=11, padding=5)
                   └─ Receptive field: 11 bp)

Position-wise FC:
  Dense(32 → 16) + ReLU + Dropout(0.1)
  └─ Dense(16 → 1)
  
Output: Per-position shape value
```

### Forward Pass Example

```python
# Input sequence
seq = "CGCGAATTCGCG"  # 12 bases

# One-hot encoding
x = one_hot_encode(seq)  # Shape: (4, 12)
x = x.unsqueeze(0)       # Shape: (1, 4, 12)

# Through layers
for layer in model.layers:
    x = layer(x)         # x stays (1, 32, 12)

# Position-wise prediction
for t in range(12):
    prediction[t] = fc_layers(x[0, :, t])  # (32,) → scalar
```

---

## 🔬 Processing Pipeline

### 1. Input Processing

```python
# Raw input
sequence = "CGCGAATTCGCG"

# Validation
assert all(b in "ACGTN" for b in sequence.upper())
assert len(sequence) >= 5
assert len(sequence) <= 10000

# Normalization
sequence = sequence.upper().replace(" ", "")
```

### 2. Encoding

```python
# One-hot encoding
A = [1,0,0,0]
C = [0,1,0,0]
G = [0,0,1,0]
T = [0,0,0,1]
N = [0.25,0.25,0.25,0.25]

# Result shape: (4, 12)
encoded = [[0,0,0,1,1,1,0,0,0,1,1,0],
           [1,0,0,0,0,0,1,1,1,0,0,1],
           [0,1,0,0,0,0,0,0,0,0,0,0],
           [0,0,1,0,0,0,0,0,0,0,0,0]]
```

### 3. Model Inference

```python
# Through 4 convolutional layers
# Captures patterns at multiple scales:
# - Layer 1: Local dimers/trimers
# - Layer 2: Tetramers/pentamers
# - Layer 3: Longer contexts
# - Layer 4: Very long-range dependencies

output = model(encoded)  # Shape: (1, 12)
# Result: 12 shape values, one per position
```

### 4. Post-processing

```python
# Normalize to feature range
if feature == "MGW":
    values = 3.0 + raw_output * 3.5  # Range: 3-8
elif feature == "Rise":
    values = 3.3 + raw_output * 0.1  # Range: 3.2-3.4

# Add fluctuation (optional)
if enable_fl:
    fl = np.abs(np.random.normal(0, 0.15, len(values)))
    values = values * (1 + fl)

# Calculate statistics
stats = {
    "min": np.min(values),
    "max": np.max(values),
    "mean": np.mean(values),
    "std": np.std(values),
}
```

---

## 🧪 Testing Examples

### Test 1: Basic Prediction

```python
# Test with homopolymer
response = predict_shape(
    sequence="AAAAAAAAAA",
    feature="MGW",
    enable_fl=False,
    deep_layer=4
)

assert response["statistics"]["mean"] > 5.0  # MGW baseline
assert response["confidence"] > 0.75  # High confidence (simple seq)
```

### Test 2: Feature Diversity

```python
# Test all features
for feature in ["MGW", "EP", "Shift", "Slide", "Rise", "Roll", "HelT"]:
    response = predict_shape(
        sequence="CGCGAATTCGCGCGCGAATTCGCG",
        feature=feature
    )
    assert response["success"]
    assert len(response["predictions"]) == 24
```

### Test 3: Comparison

```python
# Similar sequences should have high similarity
response1 = predict_shape("AAAA", "MGW")
response2 = predict_shape("AAAT", "MGW")

comparison = compare_sequences("AAAA", "AAAT", "MGW")
assert comparison["similarity"] > 0.90
```

### Test 4: Batch Processing

```python
# Test with FASTA file
with open("test.fasta", "w") as f:
    f.write(">seq1\nCGCGAATT\n>seq2\nAAAATTTT\n")

response = batch_predict(
    file="test.fasta",
    feature="MGW"
)

# Returns CSV with all predictions
assert len(response.splitlines()) > 10  # Header + data
```

---

## 📊 Implementing Custom Features

### Add New Shape Feature

**Step 1: Add to frontend dropdown**

File: `frontend/app/edna-shape-analyzer/page.tsx`

```typescript
const featureGroups = {
  'Groove Features': ['MGW', 'EP'],
  'Custom Features': ['MyFeature'],  // NEW
  // ...
};
```

**Step 2: Add to backend normalization**

File: `backend/src/routes/ednaShapeAnalyzer.ts`

```typescript
if (feature === 'MyFeature') {
  // Normalize model output to appropriate range
  predictions = 0.5 + predictions * 2.0;  // Range: -1.5 to 2.5
}
```

**Step 3: Update ML service**

File: `ml-service/edna_shape.py`

```python
def predict_shape_neural(sequence, feature, model, device):
    # ... existing code ...
    
    elif feature == "MyFeature":
        predictions = 0.0 + predictions * 5.0  # Your range
        return predictions
```

**Step 4: Add pentamer lookup (fallback)**

```python
pentamer_table = {
    "MyFeature": {
        "AAAAA": 1.2,
        "CCCCG": 2.5,
        # ... more pentamers
    },
    # ...
}
```

---

## 🤖 Implementing Species Classifier

### Replace Heuristics with Trained Model

**Option A: Random Forest**

```python
from sklearn.ensemble import RandomForestClassifier
import pickle

# Train (done offline)
X_train = shape_features  # (n_samples, n_features)
y_train = species_labels  # (n_samples,)
rf = RandomForestClassifier(n_estimators=100)
rf.fit(X_train, y_train)
pickle.dump(rf, open('species_classifier.pkl', 'wb'))

# Predict (in service)
def predict_species_from_shapes(shape_profiles):
    rf = pickle.load(open('species_classifier.pkl', 'rb'))
    
    # Extract features from profile
    features = [
        shape_profiles['MGW']['mean'],
        shape_profiles['MGW']['std'],
        shape_profiles['Rise']['mean'],
        shape_profiles['Roll']['mean'],
        # ... more features
    ]
    
    # Predict
    species_id = rf.predict([features])[0]
    confidence = rf.predict_proba([features])[0].max()
    
    return {
        "species": SPECIES_NAMES[species_id],
        "confidence": float(confidence),
    }
```

**Option B: Neural Network**

```python
import torch
import torch.nn as nn

class SpeciesClassifier(nn.Module):
    def __init__(self, n_features=10, n_species=6):
        super().__init__()
        self.fc = nn.Sequential(
            nn.Linear(n_features, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, n_species)
        )
    
    def forward(self, x):
        return self.fc(x)

# Load model
classifier = SpeciesClassifier()
classifier.load_state_dict(torch.load('species_classifier.pt'))
classifier.eval()

# Use in service
def predict_species_from_shapes(shape_profiles):
    features = torch.tensor([...])  # Extract features
    
    with torch.no_grad():
        logits = classifier(features)
        probs = torch.softmax(logits, dim=0)
    
    top_idx = probs.argmax().item()
    confidence = probs[top_idx].item()
    
    return {
        "species": SPECIES_NAMES[top_idx],
        "confidence": float(confidence),
    }
```

---

## 🔎 Debugging & Performance Tuning

### Enable Debug Logging

**Backend:**
```typescript
// In ednaShapeAnalyzer.ts
if (process.env.DEBUG) {
  console.log('Request:', req.body);
  console.log('Response:', result);
}
```

**ML Service:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug(f"Processing sequence: {sequence}")
logger.debug(f"Encoded shape: {encoded.shape}")
```

### Performance Profiling

```python
import time

start = time.time()
predictions = model(x)
forward_time = time.time() - start

print(f"Forward pass: {forward_time*1000:.2f}ms")
```

### Memory Usage

```python
import torch
print(torch.cuda.memory_allocated())  # GPU memory
print(torch.cuda.max_memory_allocated())  # Peak
```

---

## 🚀 Optimization Strategies

### 1. Model Quantization (Faster inference)

```python
quantized_model = torch.quantization.quantize_dynamic(
    model, {torch.nn.Linear}, dtype=torch.qint8
)
```

### 2. Batch Processing (Throughput)

```python
# Process multiple sequences in parallel
batch_sequences = ["ACGT...", "TGCA...", ...]
batch_encoded = torch.stack([one_hot_encode(s) for s in batch_sequences])
batch_predictions = model(batch_encoded)
```

### 3. Caching Results

```python
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_cached_prediction(sequence_hash, feature):
    # Return cached result if exists
    ...
```

### 4. Sequence Chunking

```python
def predict_long_sequence(sequence, chunk_size=1000):
    predictions = []
    for i in range(0, len(sequence), chunk_size):
        chunk = sequence[i:i+chunk_size]
        pred = model(encode(chunk))
        predictions.extend(pred)
    return predictions
```

---

## 📈 Monitoring & Logging

### Health Monitoring

```python
# Periodically check service health
async def monitor_health():
    while True:
        try:
            health = await health_check()
            if health['status'] != 'ok':
                # Alert
                logger.warning("Service degraded")
        except:
            logger.error("Health check failed")
        await asyncio.sleep(60)
```

### Usage Analytics

```python
# Track prediction patterns
predictions_log = []

def log_prediction(sequence, feature, duration):
    predictions_log.append({
        "timestamp": datetime.now(),
        "sequence_length": len(sequence),
        "feature": feature,
        "duration_ms": duration,
    })
```

---

## 🎓 Learning Resources

- **DNA Shape Concepts:** http://rohsdb.cmb.usc.edu/
- **PyTorch Docs:** https://pytorch.org/docs/stable/index.html
- **FastAPI Guide:** https://fastapi.tiangolo.com/
- **CNN for Genomics:** Nature Machine Intelligence papers on DNA shape

---

## ✅ Deployment Checklist

- [ ] Install dependencies (requirements_edna_shape.txt)
- [ ] Start ML service on port 8000
- [ ] Start Express backend on port 3001
- [ ] Start Next.js frontend on port 3000
- [ ] Test health endpoint: `/api/edna-shape/health`
- [ ] Test with sample sequence
- [ ] Verify GPU support (if available)
- [ ] Set ML_SERVICE_URL environment variable
- [ ] Test file upload functionality
- [ ] Verify CSV export works
- [ ] (Production) Enable HTTPS, authentication, rate limiting

---

Generated: March 24, 2026
Version: 1.0.0

