import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { species, startDate, endDate } = req.query;

    let queryText = `
      SELECT * FROM forecasts
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (species) {
      queryText += ` AND species = $${paramCount}`;
      params.push(species);
      paramCount++;
    }

    if (startDate) {
      queryText += ` AND forecast_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND forecast_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += ` ORDER BY forecast_date ASC LIMIT 500`;

    const result = await query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Forecasts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecasts' });
  }
});

router.get('/species-list', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT species
      FROM forecasts
      ORDER BY species ASC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { species, months } = req.body;

    if (!species || !months) {
      return res.status(400).json({ success: false, error: 'Species and months required' });
    }

    // Call ML service
    const mlResponse = await fetch('http://localhost:8000/predict/lstm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species, months })
    });

    if (!mlResponse.ok) {
      throw new Error('ML service error');
    }

    const predictions = await mlResponse.json();

    // Store predictions
    for (const pred of (predictions as any[])) {
      await query(
        `INSERT INTO forecasts (species, forecast_date, predicted_abundance, confidence_interval_low, confidence_interval_high, model_version)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          species,
          pred.date,
          pred.predicted_abundance,
          pred.confidence_low,
          pred.confidence_high,
          'lstm-v1'
        ]
      );
    }

    res.json({ success: true, data: predictions });
  } catch (error) {
    console.error('Generate forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

export default router;
