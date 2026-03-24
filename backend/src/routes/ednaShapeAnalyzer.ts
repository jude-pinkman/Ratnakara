import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

const router = Router();

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/edna');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.fasta', '.fa', '.txt', '.csv', '.fastq'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only FASTA, FASTQ, CSV, and TXT files are allowed'));
    }
  },
});

/**
 * Call Python ML service
 */
async function callMLService(endpoint: string, payload: any): Promise<any> {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  try {
    const response = await fetch(`${mlServiceUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ML Service error: ${response.status} - ${errorText}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('ML Service call failed:', error);
    throw error;
  }
}

/**
 * POST /api/edna-shape/predict
 * Single sequence prediction
 */
router.post('/predict', async (req: Request, res: Response) => {
  try {
    const { sequence, feature, enableFL, deepLayer } = req.body;

    // Validation
    if (!sequence || typeof sequence !== 'string') {
      return res.status(400).json({ error: 'Invalid sequence' });
    }

    const cleanSeq = sequence.toUpperCase().replace(/\s/g, '');
    if (!/^[ACGTN]+$/.test(cleanSeq)) {
      return res.status(400).json({ error: 'Sequence contains invalid characters' });
    }

    if (cleanSeq.length < 5) {
      return res.status(400).json({ error: 'Sequence must be at least 5 bases' });
    }

    // Call Python service
    const mlResult = await callMLService('/shape/predict', {
      sequence: cleanSeq,
      feature: feature || 'MGW',
      enable_fl: enableFL || false,
      deep_layer: deepLayer || 4,
    });

    // Enhance result with confidence scoring
    const confidence = calculateConfidence(cleanSeq.length, mlResult);

    res.json({
      success: true,
      sequence: cleanSeq,
      feature: feature || 'MGW',
      predictions: mlResult.predictions,
      statistics: mlResult.statistics,
      confidence,
      processingTimeMs: mlResult.processing_time_ms,
    });
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: error.message || 'Prediction failed' });
  }
});

/**
 * POST /api/edna-shape/compare
 * Compare two sequences
 */
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const { sequence1, sequence2, feature } = req.body;

    // Validation
    if (!sequence1 || !sequence2) {
      return res.status(400).json({ error: 'Both sequences required' });
    }

    const seq1 = sequence1.toUpperCase().replace(/\s/g, '');
    const seq2 = sequence2.toUpperCase().replace(/\s/g, '');

    if (!/^[ACGTN]+$/.test(seq1) || !/^[ACGTN]+$/.test(seq2)) {
      return res.status(400).json({ error: 'Sequences contain invalid characters' });
    }

    // Call Python service
    const mlResult = await callMLService('/shape/compare', {
      sequence1: seq1,
      sequence2: seq2,
      feature: feature || 'MGW',
    });

    res.json({
      success: true,
      sequence1: seq1,
      sequence2: seq2,
      feature: feature || 'MGW',
      difference: mlResult.difference,
      similarity: mlResult.similarity,
      processingTimeMs: mlResult.processing_time_ms,
    });
  } catch (error: any) {
    console.error('Comparison error:', error);
    res.status(500).json({ error: error.message || 'Comparison failed' });
  }
});

/**
 * POST /api/edna-shape/batch-predict
 * Batch predict from file
 */
router.post('/batch-predict', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { feature, deepLayer } = req.body;
    const filePath = req.file.path;

    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const sequences = parseSequenceFile(fileContent);

    if (sequences.length === 0) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'No valid sequences found in file' });
    }

    // Process all sequences
    const results = [];
    for (const seq of sequences) {
      try {
        const mlResult = await callMLService('/shape/predict', {
          sequence: seq,
          feature: feature || 'MGW',
          enable_fl: false,
          deep_layer: parseInt(deepLayer) || 4,
        });

        results.push({
          sequence: seq,
          feature: feature || 'MGW',
          length: seq.length,
          predictions: mlResult.predictions,
          statistics: mlResult.statistics,
        });
      } catch (error) {
        console.error(`Failed to process sequence: ${seq}`, error);
      }
    }

    // Generate CSV
    const csv = generateCSV(results);

    // Send CSV as response
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="predictions-${Date.now()}.csv"`);
    res.send(csv);

    // Cleanup
    fs.unlinkSync(filePath);
  } catch (error: any) {
    console.error('Batch prediction error:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: error.message || 'Batch prediction failed' });
  }
});

/**
 * POST /api/edna-shape/species-insight
 * Predict species from DNA shape features
 */
router.post('/species-insight', async (req: Request, res: Response) => {
  try {
    const { sequence, shapes } = req.body;

    if (!sequence) {
      return res.status(400).json({ error: 'Sequence required' });
    }

    // Call Python service for species prediction
    const mlResult = await callMLService('/shape/species-insight', {
      sequence,
      shapes: shapes || {},
    });

    res.json({
      success: true,
      sequence,
      species_predictions: mlResult.species_predictions,
      ecological_signals: mlResult.ecological_signals,
      confidence: mlResult.confidence,
    });
  } catch (error: any) {
    console.error('Species insight error:', error);
    res.status(500).json({ error: error.message || 'Species insight failed' });
  }
});

/**
 * POST /api/edna-shape/ecological-analysis
 * Analyze ecological insights
 */
router.post('/ecological-analysis', async (req: Request, res: Response) => {
  try {
    const { sequences } = req.body;

    if (!sequences || !Array.isArray(sequences) || sequences.length === 0) {
      return res.status(400).json({ error: 'Array of sequences required' });
    }

    // Call Python service
    const mlResult = await callMLService('/shape/ecological-analysis', {
      sequences,
    });

    res.json({
      success: true,
      biodiversity_richness: mlResult.biodiversity_richness,
      dominant_species: mlResult.dominant_species,
      anomalies: mlResult.anomalies,
      diversity_index: mlResult.diversity_index,
    });
  } catch (error: any) {
    console.error('Ecological analysis error:', error);
    res.status(500).json({ error: error.message || 'Ecological analysis failed' });
  }
});

/**
 * GET /api/edna-shape/health
 * Health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${mlServiceUrl}/health`, { signal: AbortSignal.timeout(5000) });
    const healthy = response.ok;

    res.json({
      success: true,
      backend: 'ok',
      ml_service: healthy ? 'ok' : 'unavailable',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.json({
      success: false,
      backend: 'ok',
      ml_service: 'unavailable',
      error: 'ML Service is not responding',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Helper: Parse sequence file (FASTA, FASTQ, CSV, TXT)
 */
function parseSequenceFile(content: string): string[] {
  const sequences: string[] = [];

  if (content.startsWith('>')) {
    // FASTA format
    let currentSeq = '';
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('>')) {
        if (currentSeq) sequences.push(currentSeq);
        currentSeq = '';
      } else {
        currentSeq += line.trim();
      }
    }
    if (currentSeq) sequences.push(currentSeq);
  } else if (content.startsWith('@')) {
    // FASTQ format
    const lines = content.split('\n');
    for (let i = 1; i < lines.length; i += 4) {
      if (lines[i]) sequences.push(lines[i].trim());
    }
  } else {
    // CSV or plain text (one sequence per line)
    const lines = content.split('\n');
    for (const line of lines) {
      const seq = line.trim().split(',')[0]; // Take first column if CSV
      if (seq && /^[ACGTN]+$/i.test(seq)) {
        sequences.push(seq.toUpperCase());
      }
    }
  }

  return sequences.filter((seq) => seq.length >= 5);
}

/**
 * Helper: Generate CSV from results
 */
function generateCSV(results: any[]): string {
  const rows: string[] = [
    ['Sequence', 'Feature', 'Length', 'Position', 'Base', 'Value', 'Min', 'Max', 'Mean', 'Std'].join(','),
  ];

  for (const result of results) {
    for (const pred of result.predictions) {
      rows.push(
        [
          result.sequence,
          result.feature,
          result.length,
          pred.position,
          pred.base,
          pred.value.toFixed(6),
          result.statistics.min.toFixed(6),
          result.statistics.max.toFixed(6),
          result.statistics.mean.toFixed(6),
          result.statistics.std.toFixed(6),
        ].join(',')
      );
    }
  }

  return rows.join('\n');
}

/**
 * Helper: Calculate confidence score
 */
function calculateConfidence(sequenceLength: number, mlResult: any): number {
  // Base confidence from sequence length
  let confidence = Math.min(sequenceLength / 500, 1.0); // 500bp = max confidence from length

  // Adjust based on prediction variance
  const variance = mlResult.statistics.std;
  const meanValue = mlResult.statistics.mean;

  if (meanValue !== 0) {
    const cv = variance / Math.abs(meanValue); // Coefficient of variation
    const varianceScore = Math.exp(-cv); // Lower variance = higher confidence
    confidence = (confidence + varianceScore) / 2;
  }

  return Math.round(confidence * 100) / 100;
}

export default router;
