# 🧬 Deep eDNA Shape Analyzer - Quick Reference Card

## 🚀 Quick Start

```bash
# Windows
setup-edna-shape.bat

# Linux/macOS  
bash setup-edna-shape.sh

# Then start 3 terminals:
# Terminal 1: cd backend && npm run dev
# Terminal 2: cd ml-service && source venv/bin/activate && python edna_shape.py
# Terminal 3: cd frontend && npm run dev

# Open: http://localhost:3000/edna-shape-analyzer
```

---

## 📊 DNA Shape Features (14 Types)

### Groove Features
| Feature | Short | Range | Notes |
|---------|-------|-------|-------|
| MGW | Minor Groove Width | 3-8 Å | Tighter = smaller value |
| EP | Electrostatic Potential | -1 to 0 | More negative = electron-rich |

### Intra-base-pair (Same strand)
| Feature | Short | Range | Notes |
|---------|-------|-------|-------|
| Shear | Base pair shear | ±2 Å | Lateral sliding |
| Stretch | Elongation | ±0.5 Å | Pulling apart |
| Stagger | Vertical offset | ±0.5 Å | Up/down shift |
| Buckle | Rotation | ±30° | Pitching motion |
| ProT | Propeller Twist | ±30° | Twisting angle |
| Opening | Separation | 0-5 Å | Distance |

### Inter-base-pair (Between strands)
| Feature | Short | Range | Notes |
|---------|-------|-------|-------|
| Shift | XY movement | ±3 Å | In-plane shift |
| Slide | Helical slide | ±5 Å | Along helix |
| Rise | Vertical spacing | 3.0-3.5 Å | Per base pair |
| Tilt | Tilt angle | ±30° | Bending |
| Roll | Rolling angle | ±30° | Side-to-side |
| HelT | Helical Twist | 30-40° | Rotation angle |

---

## 🔗 API Endpoints

### 1. Single Prediction
```bash
curl -X POST http://localhost:3001/api/edna-shape/predict \
  -H "Content-Type: application/json" \
  -d '{"sequence":"CGCGAATTCGCG","feature":"MGW"}'
```

### 2. Compare Two Sequences
```bash
curl -X POST http://localhost:3001/api/edna-shape/compare \
  -H "Content-Type: application/json" \
  -d '{"sequence1":"CGCGAA","sequence2":"AAAATT","feature":"Roll"}'
```

### 3. Batch Upload
```bash
curl -X POST http://localhost:3001/api/edna-shape/batch-predict \
  -F "file=@sequences.fasta" \
  -F "feature=MGW" \
  --output results.csv
```

### 4. Species Insight
```bash
curl -X POST http://localhost:3001/api/edna-shape/species-insight \
  -H "Content-Type: application/json" \
  -d '{"sequence":"CGCGAATTCGCG"}'
```

### 5. Ecological Analysis
```bash
curl -X POST http://localhost:3001/api/edna-shape/ecological-analysis \
  -H "Content-Type: application/json" \
  -d '{"sequences":["AAAA","TTTT","GGGG"]}'
```

### 6. Health Check
```bash
curl http://localhost:3001/api/edna-shape/health
```

---

## 📋 File Formats

### FASTA
```fasta
>sequence_1
CGCGAATTCGCG
>sequence_2
AAAAAATTTTTT
```

### FASTQ
```fastq
@seq1
CGCGAATTCGCG
+
IIIIIIIIIIII
```

### CSV
```csv
sequence_id,sequence
seq1,CGCGAATTCGCG
seq2,AAAAAATTTTTT
```

### TXT
```
CGCGAATTCGCG
AAAAAATTTTTT
GGGGGGCCCCCC
```

---

## ⚙️ Configuration

### Environment Variables
```env
ML_SERVICE_URL=http://localhost:8000    # Where ML service runs
NODE_ENV=development                     # development or production
PORT=3001                                # Backend port
```

### Deep Layer Options
| Depth | Speed | Complexity | Use Case |
|-------|-------|-----------|----------|
| 2 | Fast ⚡ | Low | Quick analysis |
| 3 | Medium | Light | Balanced |
| **4** | Medium+ | Medium | **Default** |
| 5 | Slow 🐢 | High | Deep analysis |

---

## 🧪 Test Sequences

### Quick Test
```
CGCGAATTCGCG
```

### Homopolymer (all same base)
```
AAAAAAAAAA
TTTTTTTTTT
GGGGGGGGGG
CCCCCCCCCC
```

### Alternating
```
CGCGCGCGCG
ATATAT
```

### Complex
```
CGCGAATTCGCGCGCGAATTCGCGATTGCTAGCTAGCTAGC
```

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| **Can't connect to ML service** | `python edna_shape.py` not running on port 8000 |
| **GPU out of memory** | Edit `edna_shape.py`: `device = torch.device("cpu")` |
| **File upload fails** | Use FASTA, FASTQ, CSV, or TXT format |
| **Sequence too short** | Minimum 5 bases |
| **Port already in use** | Change PORT in .env |
| **Dependencies missing** | Run `pip install -r requirements_edna_shape.txt` |

---

## 📈 Performance Tips

### Speed Up
- ✅ Use smaller sequences (< 500bp)
- ✅ Reduce deep layer (to 2-3)
- ✅ Enable GPU (auto-detected)
- ✅ Batch process multiple at once

### Improve Accuracy
- ✅ Use full length sequences
- ✅ Increase deep layer (to 5)
- ✅ Enable shape fluctuation
- ✅ Compare with multiple features

---

## 🔍 Understanding Results

### MGW (Minor Groove Width)
- **High (~7):** Wide groove, GC-rich, stable
- **Low (~4):** Narrow groove, AT-rich, less stable

### Roll (Base pair rotation)
- **High (>20°):** Bent DNA, less flexible
- **Low (~0°):** Straight DNA, more flexible

### Rise (Vertical spacing)
- **~3.3 Å:** Normal B-form DNA
- **>3.5 Å:** Extended conformation
- **<3.2 Å:** Compressed conformation

### Helical Twist
- **High (~36°):** Overtwisted, tense
- **Low (~32°):** Underwound, relaxed
- **~34°:** Standard

---

## 🐳 Docker

### Build
```bash
docker build -t edna-shape-ml ml-service/ -f ml-service/Dockerfile.edna_shape
```

### Run Single
```bash
docker run -p 8000:8000 edna-shape-ml
```

### Run All (Compose)
```bash
docker-compose -f docker-compose.edna-shape.yml up --build
```

---

## 📊 Response Format

### Success
```json
{
  "success": true,
  "sequence": "CGCGAATTCGCG",
  "feature": "MGW",
  "predictions": [
    {"position": 1, "base": "C", "value": 5.234}
  ],
  "statistics": {
    "min": 4.123,
    "max": 7.456,
    "mean": 5.678,
    "std": 0.923
  },
  "confidence": 0.87,
  "processingTimeMs": 245
}
```

### Error
```json
{
  "success": false,
  "error": "Sequence contains invalid characters",
  "timestamp": "2026-03-24T10:30:00Z"
}
```

---

## 🔧 Common Edits

### Add New Feature
1. Update frontend dropdown (14 groups)
2. Add normalization in backend routes
3. Update ML service prediction

### Change Predictions Range
Edit in `edna_shape.py`:
```python
if feature == "MGW":
    predictions = 3.0 + predictions * 3.5  # Range: 3-8
```

### Customize UI Color
Edit frontend `page.tsx`:
```typescript
className="bg-blue-600"  // Change to any Tailwind color
```

---

## 🎓 Key Files

| File | Purpose | Size |
|------|---------|------|
| `frontend/app/edna-shape-analyzer/page.tsx` | UI Component | 700 lines |
| `backend/src/routes/ednaShapeAnalyzer.ts` | API Routes | 500 lines |
| `ml-service/edna_shape.py` | ML Service | 600 lines |
| `EDNA_SHAPE_SETUP.md` | Setup Guide | 500+ lines |
| `EDNA_SHAPE_DEVELOPER.md` | Tech Details | 1000+ lines |

---

## ✅ Checklist

### Setup
- [ ] Run setup script
- [ ] Start backend (`npm run dev`)
- [ ] Start ML service (`python edna_shape.py`)
- [ ] Start frontend (`npm run dev`)
- [ ] Open http://localhost:3000/edna-shape-analyzer

### First Test
- [ ] Load example sequence
- [ ] Click "Run Prediction"
- [ ] See MGW graph
- [ ] Export as CSV
- [ ] Try comparison mode

### Deployment
- [ ] Test all endpoints
- [ ] Enable HTTPS
- [ ] Set up logging
- [ ] Configure rate limiting
- [ ] Deploy to cloud

---

## 🚀 Next Steps

1. **Try it:** Click "Load Example" in UI
2. **Explore:** Switch between 14 features
3. **Test uploads:** Try batch processing
4. **Customize:** Edit colors, add features
5. **Deploy:** Use docker-compose for production

---

## 📞 Documentation

| Doc | Use For |
|-----|---------|
| **EDNA_SHAPE_README.md** | Overview & features |
| **EDNA_SHAPE_SETUP.md** | Installation & API |
| **EDNA_SHAPE_DEVELOPER.md** | Architecture & code |
| **This card** | Quick lookups |

---

**Questions?** Check `EDNA_SHAPE_SETUP.md` → "Troubleshooting" section

**Want to extend?** Check `EDNA_SHAPE_DEVELOPER.md` → "Extending the Module" section

---

Generated: March 24, 2026  
Status: ✅ Production Ready  

🧬 Ready to analyze DNA shapes? Start here! 🚀

