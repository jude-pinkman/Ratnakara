# Ratnakara: Quick Reference & Visual Summary

## What You're Building

### Current State (Today)
A **marine data dashboard** with 15 pages showing:
- Ocean temperature, salinity trends across 80 monitoring stations
- Fisheries catch data for 6 major species
- eDNA genetic analysis across 90 samples
- Biodiversity risk metrics, forecasts, alerts

**Technology**: Next.js Frontend + Express Backend (No Database, all in-memory)

---

### Enhanced State (Proposed)
Same dashboard + **AI-powered classification module** with:
- **Otolith Classifier**: Upload fish ear image → Get age + species in 2 seconds
- **eDNA Classifier**: Upload DNA file → Get species composition in 2 minutes
- **Results History**: View, filter, export all past classifications

**New Technology**: Python ML Service (Flask) + PyTorch models

---

## The Three New Pages

### Page 1: Otolith Classification
```
┌─────────────────────────────────────────────────────────┐
│  🐟 Otolith Age & Species Classification               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📤 DROP OTOLITH IMAGE HERE                             │
│  (or click to upload)                                  │
│  ✓ Accepts: JPG, PNG                                   │
│  ✓ Max: 50 MB                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Preview Image]  [Classify Button]                    │
└─────────────────────────────────────────────────────────┘

AFTER CLICKING CLASSIFY:

┌─────────────────────────────────────────────────────────┐
│  ✅ CLASSIFICATION COMPLETE (0.8 seconds)              │
├─────────────────────────────────────────────────────────┤
│  Species: Indian Mackerel         Confidence: 94% ####│
│  (Rastrelliger kanagurta)                              │
│                                                          │
│  Age: 3 years                     Confidence: 87% ####│
│  Estimated Length: 22.4 cm ±1.8                        │
│                                                          │
│  📊 Ring Detection: 3 rings identified                 │
│  📈 Image Quality Score: 92%                           │
│                                                          │
│  [View Full Report] [Save to History] [Classify More] │
└─────────────────────────────────────────────────────────┘
```

---

### Page 2: eDNA Classification
```
┌─────────────────────────────────────────────────────────┐
│  🧬 eDNA Sequence Species Classification               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  📤 DROP DNA SEQUENCE FILE HERE                         │
│  (or click to upload)                                 │
│  ✓ Accepts: FASTA, CSV, FASTQ                          │
│  ✓ Max: 50 MB                                          │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [File Preview] [Analyze Button]                       │
│  12 sequences, 4,896 bases, GC: 52%                    │
└─────────────────────────────────────────────────────────┘

AFTER CLICKING ANALYZE:

┌─────────────────────────────────────────────────────────┐
│  ✅ ANALYSIS COMPLETE (2.3 seconds)                    │
├─────────────────────────────────────────────────────────┤
│  DETECTED SPECIES:                                     │
│                                                          │
│  1. 🐟 Indian Mackerel            89% ########################
│     10/12 sequences matched | Alignment: 94%            │
│                                                          │
│  2. 🐟 Yellowfin Tuna              7% ##                │
│     1/12 sequences matched | Alignment: 76%             │
│                                                          │
│  3. ❓ Unknown                     4% #                 │
│     1/12 sequences (no match)                           │
│                                                          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  DIVERSITY METRICS:                                    │
│  • Shannon Index: 0.45 (LOW - mostly one species)      │
│  • Species Richness: 2-3 species detected              │
│  • Dominant: Indian Mackerel (89%)                     │
│                                                          │
│  QUALITY METRICS:                                      │
│  • Sequences passed QC: 12/12 ✓                        │
│  • GC Content: 52% (normal)                            │
│  • Avg Q-Score: 38.5 (good)                            │
│                                                          │
│  [View Alignment] [Save] [Download Report] [Analysis More] │
└─────────────────────────────────────────────────────────┘
```

---

### Page 3: Results History
```
┌─────────────────────────────────────────────────────────┐
│  📋 Classification Results History (42 total)           │
├─────────────────────────────────────────────────────────┤
│  Filter: [All Types ▼] [Date Range ▼] [Confidence ▼]  │
├─────────────────────────────────────────────────────────┤
│ ID           │ Type  │ File              │ Species      │ Conf  │ Date       │
├──────────────┼───────┼───────────────────┼──────────────┼───────┼────────────┤
│ oto-...-001  │ Otto  │ fish_001.jpg      │ Mackerel     │ 94%   │ 2026-03-24 │ → [VIEW]
│ edna-...-001 │ eDNA  │ gulf_samples.fasta│ Mackerel     │ 89%   │ 2026-03-23 │ → [VIEW]
│ oto-...-002  │ Otto  │ fish_002.jpg      │ Tuna         │ 87%   │ 2026-03-22 │ → [VIEW]
│ oto-...-003  │ Otto  │ fish_003.jpg      │ Sardine      │ 91%   │ 2026-03-21 │ → [VIEW]
│ edna-...-002 │ eDNA  │ bay_seq.csv       │ Mixed (3sp)  │ 76%   │ 2026-03-20 │ → [VIEW]
│ ...          │ ...   │ ...               │ ...          │ ...   │ ...        │
├─────────────────────────────────────────────────────────┤
│                    [Show 20 of 42]                      │
│ [Export CSV] [Export PDF] [Batch Compare]              │
└─────────────────────────────────────────────────────────┘
```

---

## The Three New API Routes

### Route 1: Classify Otolith
```
POST /api/classify/otolith
Content-Type: multipart/form-data

REQUEST:
  file: <image.jpg>

RESPONSE (200 OK):
{
  "success": true,
  "classificationId": "oto-2026-03-24-001",
  "results": {
    "species": {
      "predicted": "Rastrelliger kanagurta",
      "confidence": 0.94
    },
    "age": {
      "predicted": 3,
      "unit": "years",
      "confidence": 0.87
    },
    "length": {
      "predicted": 22.4,
      "unit": "cm",
      "confidence": 0.91,
      "range": [21.0, 23.8]
    },
    "rings_detected": 3,
    "image_quality": 0.92
  }
}
```

### Route 2: Classify eDNA
```
POST /api/classify/edna
Content-Type: multipart/form-data

REQUEST:
  file: <sequences.fasta>

RESPONSE (200 OK):
{
  "success": true,
  "classificationId": "edna-2026-03-24-001",
  "results": {
    "species": [
      { "rank": 1, "species": "Rastrelliger kanagurta", "confidence": 0.89 },
      { "rank": 2, "species": "Thunnus albacares", "confidence": 0.07 },
      { "rank": 3, "species": "Unknown", "confidence": 0.04 }
    ],
    "diversity": {
      "shannon_index": 0.45,
      "species_richness": 2
    }
  }
}
```

### Route 3: Get Results History
```
GET /api/classify/results?type=otolith&limit=20

RESPONSE (200 OK):
{
  "success": true,
  "results": [
    {
      "id": "oto-2026-03-24-001",
      "type": "otolith",
      "filename": "fish_otolith.jpg",
      "classified_at": "2026-03-24T10:30:00Z",
      "species": "Rastrelliger kanagurta",
      "age": 3,
      "confidence": 0.94
    },
    ...
  ],
  "total": 42
}
```

---

## Data Flow Diagram

```
USER INTERACTION:

┌─────────────────────┐
│  User Uploads File  │
│  (Otolith or eDNA)  │
└──────────┬──────────┘
           │
           ↓
┌─────────────────────┐
│  Frontend Displays  │
│  Preview & Status   │
└──────────┬──────────┘
           │
           ↓ "Classify" click
┌─────────────────────────────────────────────┐
│  POST /api/classify/[otolith|edna]         │
│  + File Binary Data                         │
└──────────────┬──────────────────────────────┘
               │
               ↓
    ┌──────────────────────┐
    │  Express Backend     │
    │ (classification.ts)  │
    │                      │
    │ 1. Validate file     │
    │ 2. Store temporarily │
    │ 3. Call ML Service   │
    │ 4. Save to JSON      │
    │ 5. Return result     │
    └──────────┬───────────┘
               │
               ├─────→ Call Python Service
               │       (port 5000)
               │           ↓
               │       ┌─────────────┐
               │       │  Flask App  │
               │       │             │
               │       │ /classify/  │
               │       │  otolith    │
               │       │             │
               │       │ Load model  │
               │       │ Process img │
               │       │ Return json │
               │       └──────┬──────┘
               │              │
               │              ↓
               │   ┌───────────────────┐
               │   │   ResNet-50 CNN   │
               │   │  PyTorch Model    │
               │   │                   │
               │   │ Image → Features  │
               │   │ → Classification  │
               │   └───────────────────┘
               │
               ↓ ML result returned
    ┌──────────────────────┐
    │  Store in JSON:      │
    │  /data/              │
    │  classifications.json │
    ["oto-...-001" : {...}]
    └──────────────────────┘
               │
               ↓
    ┌──────────────────────┐
    │  HTTP 200 Response   │
    │  with results JSON   │
    └──────────┬───────────┘
               │
               ↓
    ┌──────────────────────┐
    │  Frontend Displays   │
    │  Result Card:        │
    │  "Indian Mackerel,   │
    │   Age 3, 22.4 cm"    │
    └──────────────────────┘
```

---

## File Structure After Implementation

```
Ratnakara/
├── README.md (updated: add classification section)
├── PROJECT_SUMMARY.md (updated: describe classification)
├── PRODUCT_PROPOSAL.md (NEW: 12 sections)
├── IMPLEMENTATION_GUIDE.md (NEW: technical details)
│
├── frontend/
│   ├── app/
│   │   ├── classification/
│   │   │   ├── page.tsx (redirect to otolith)
│   │   │   ├── otolith/
│   │   │   │   └── page.tsx (NEW)
│   │   │   ├── edna/
│   │   │   │   └── page.tsx (NEW)
│   │   │   └── results/
│   │   │       └── page.tsx (NEW)
│   │   ├── dashboard/page.tsx
│   │   ├── ocean/page.tsx
│   │   └── ... (existing pages)
│   │
│   ├── components/
│   │   ├── Navigation.tsx (UPDATED: add classification menu)
│   │   ├── UploadBox.tsx (NEW)
│   │   ├── ResultCard.tsx (NEW)
│   │   ├── ClassificationHistory.tsx (NEW)
│   │   └── ... (existing components)
│   │
│   └── lib/
│       └── api.ts (UPDATED: add classificationAPI)
│
├── backend/
│   ├── package.json (UPDATED: add multer, sharp)
│   ├── uploads/ (NEW directory for temp files)
│   │   ├── otoliths/
│   │   └── edna/
│   ├── data/
│   │   ├── classifications.json (NEW: local result storage)
│   │   └── ... (existing data)
│   │
│   └── src/
│       ├── app.ts (UPDATED: mount classification routes)
│       ├── routes/
│       │   ├── localApi.ts (existing)
│       │   └── classification.ts (NEW: 500+ lines)
│       │
│       └── services/
│           ├── mlService.ts (NEW)
│           ├── imageProcessor.ts (NEW)
│           ├── sequenceProcessor.ts (NEW)
│           └── resultStorage.ts (NEW)
│
└── ml-service/ (NEW entire directory)
    ├── main.py (NEW: Flask app, 350+ lines)
    ├── requirements.txt (NEW: Python dependencies)
    └── models/
        ├── otolith_cnn.pt (pre-trained, ~100MB)
        └── edna_lstm.pt (pre-trained, ~50MB)
```

---

## Summary Table

| Aspect | Current | Proposed Enhancement |
|--------|---------|----------------------|
| **Frontend Pages** | 15 pages | 15 + 3 classification pages |
| **API Routes** | 30+ endpoints (data read) | 30+ + 3 classification (file upload, process) |
| **Backend Services** | 1 (Express) | 2 (Express + Python Flask) |
| **Database** | None (in-memory) | None (local JSON for results) |
| **File Upload** | None | Yes (images + sequences) |
| **ML Models** | None | 2 (CNN + LSTM+BLAST) |
| **Processing Time** | N/A | 0.8-2.3 seconds per classification |
| **Data Storage** | 80 ocean + 120 fish + 90 edna | + Classification results (JSON file) |

---

## User Personas & Use Cases

### 1. **Marine Researcher** (Academic)
**Goal**: Identify fish species from otolith samples
**Workflow**:
- Receives 50 otolith images from field survey
- Uploads each image to classifier
- Gets age + species identification instantly
- Exports batch results as CSV for thesis

### 2. **Geneticist** (Lab)
**Goal**: Identify species composition in eDNA water samples
**Workflow**:
- Runs DNA sequencing on Gulf water samples
- Exports sequences as FASTA
- Uploads to eDNA classifier
- Gets species list + diversity metrics
- Saves to results history for comparison

### 3. **Fisheries Manager** (Government)
**Goal**: Monitor catch and verify species identification
**Workflow**:
- Field agents upload photos of daily catch
- Classifier confirms species identified by hand
- Alerts if unexpected species detected
- Tracks species trends over months

### 4. **Student** (Classroom)
**Goal**: Learn marine species identification
**Workflow**:
- Practices with classroom sample images/sequences
- Classifier provides instant feedback with confidence scores
- Views results history to understand patterns
- Exports report for assignment submission

---

## Success Metrics (Post-Launch)

- ✅ Otolith classification: >90% species accuracy
- ✅ eDNA classification: >85% species accuracy (from consensus)
- ✅ Processing time: <3 seconds per classification
- ✅ User satisfaction: >4.5/5 stars
- ✅ Adoption: 50+ monthly active users (first year)
- ✅ Classifications: 1000+ accumulated results

---

## Timeline & Effort Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **1. Setup** | 3 days | Create routes, setup file upload, create pages |
| **2. Frontend** | 5 days | Build UI components, results page, integrate API |
| **3. Python Service** | 7 days | Flask app, ML model integration, preprocessing |
| **4. Integration** | 4 days | Connect services, test end-to-end |
| **5. Polish** | 3 days | Error handling, documentation, performance tuning |
| **TOTAL** | 3-4 weeks | Fully functional classification system |

---

## Next Steps

1. **Approve** this proposal
2. **Obtain** pre-trained model weights (or plan to train)
3. **Gather** sample data (otolith images, eDNA sequences)
4. **Begin** Phase 1 implementation
5. **Launch** beta with internal testers
6. **Gather** feedback and iterate

---

**Questions?**  
Refer to `PRODUCT_PROPOSAL.md` (detailed architecture) or `IMPLEMENTATION_GUIDE.md` (code details)

