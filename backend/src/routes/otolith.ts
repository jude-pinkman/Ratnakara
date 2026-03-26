import { Router, Request, Response } from 'express';
import multer from 'multer';

import { getPostgresPool } from '../db/postgres.js';

const router = Router();
const otolithReviewThreshold = Number(process.env.OTOLITH_REVIEW_THRESHOLD || 0.85);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});

async function callMLService(imageBuffer: Buffer, filename: string, mimeType: string) {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

  const FormDataCtor = (globalThis as any).FormData;
  const BlobCtor = (globalThis as any).Blob;
  const formData = new FormDataCtor();
  const fileBlob = new BlobCtor([imageBuffer], { type: mimeType });
  formData.append('image', fileBlob, filename);

  let response: globalThis.Response;
  try {
    response = await fetch(`${mlServiceUrl}/predict/otolith`, {
      method: 'POST',
      body: formData,
    });
  } catch (error: any) {
    const upstreamError: any = new Error(
      `ML service unreachable at ${mlServiceUrl}. Start ml-service (python main.py) or set ML_SERVICE_URL correctly.`
    );
    upstreamError.status = 503;
    upstreamError.cause = error;
    throw upstreamError;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const payload: any = await response.json();
      detail = payload?.detail || payload?.error || JSON.stringify(payload);
    } catch {
      detail = await response.text();
    }

    const upstreamError: any = new Error(`ML otolith prediction failed (${response.status}): ${detail}`);
    upstreamError.status = response.status;
    throw upstreamError;
  }

  return response.json();
}

async function getTaxonomyForSpecies(species: string) {
  const pool = getPostgresPool();
  const speciesKey = species.toLowerCase().trim();

  const sql = `
    SELECT species, kingdom, phylum, class, order_name, family, genus, common_name, description
    FROM taxonomy
    WHERE LOWER(species) = $1 OR REPLACE(LOWER(species), ' ', '_') = $1
    LIMIT 1
  `;

  const { rows } = await pool.query(sql, [speciesKey]);
  return rows[0] || null;
}

router.post('/predict', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const mlPrediction: any = await callMLService(req.file.buffer, req.file.originalname, req.file.mimetype);
    const species = String(mlPrediction.species || '').trim();
    const confidence = Number(mlPrediction.confidence || 0);
    const requiresReview =
      typeof mlPrediction.requires_review === 'boolean'
        ? mlPrediction.requires_review || confidence < otolithReviewThreshold
        : confidence < otolithReviewThreshold;

    if (!species) {
      return res.status(502).json({ error: 'ML service returned empty species' });
    }

    const taxonomy = await getTaxonomyForSpecies(species);

    return res.json({
      species,
      confidence,
      requires_review: requiresReview,
      review_threshold: otolithReviewThreshold,
      review_note: requiresReview
        ? `Low-confidence prediction. Confidence ${(confidence * 100).toFixed(2)}% is below review threshold ${(otolithReviewThreshold * 100).toFixed(0)}%.`
        : null,
      taxonomy: taxonomy
        ? {
            kingdom: taxonomy.kingdom,
            phylum: taxonomy.phylum,
            class: taxonomy.class,
            order: taxonomy.order_name,
            family: taxonomy.family,
            genus: taxonomy.genus,
            common_name: taxonomy.common_name,
            description: taxonomy.description,
          }
        : null,
    });
  } catch (error: any) {
    console.error('Otolith prediction route error:', error);
    const status = Number(error?.status) || 500;
    return res.status(status).json({ error: error.message || 'Otolith prediction failed' });
  }
});

router.get('/detected-species', async (_req: Request, res: Response) => {
  try {
    const pool = getPostgresPool();
    const sql = `
      SELECT
        r.species,
        COUNT(*) AS detections,
        t.family,
        t.genus,
        t.order_name,
        t.class
      FROM otolith_records r
      LEFT JOIN taxonomy t ON t.species = r.species
      GROUP BY r.species, t.family, t.genus, t.order_name, t.class
      ORDER BY detections DESC
      LIMIT 50
    `;

    const { rows } = await pool.query(sql);
    return res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('Detected species query failed:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to query otolith species' });
  }
});

export default router;
