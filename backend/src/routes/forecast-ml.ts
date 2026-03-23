import { Router, Request, Response } from 'express';
import { query } from '../db/connection.js';

const router = Router();

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

// Get all forecasts from database
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

// Get available species for forecasting
router.get('/species-list', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT DISTINCT species
      FROM fisheries_data
      WHERE species IS NOT NULL
      ORDER BY species ASC
      LIMIT 50
    `);
    res.json({ success: true, data: result.rows.map((r: any) => r.species) });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

// Generate LSTM forecast - calls ML service
router.post('/predict/lstm', async (req: Request, res: Response) => {
  try {
    const { species, months } = req.body;

    if (!species || !months) {
      return res.status(400).json({ success: false, error: 'species and months required' });
    }

    // Call ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/lstm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ species, months }),
    });

    if (!mlResponse.ok) {
      throw new Error('ML service unavailable');
    }

    const predictions = await mlResponse.json();

    // Store in database
    if (predictions && Array.isArray(predictions)) {
      const values: any[] = [];
      let paramIndex = 1;
      let insertQuery = `
        INSERT INTO forecasts (species, forecast_date, predicted_abundance, confidence_low, confidence_high, created_at)
        VALUES
      `;

      const valueClauses = predictions.map((pred: any) => {
        values.push(
          species,
          pred.date,
          pred.predicted_abundance,
          pred.confidence_low,
          pred.confidence_high,
          new Date().toISOString()
        );
        const clause = `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5})`;
        paramIndex += 6;
        return clause;
      });

      insertQuery += valueClauses.join(', ') + ' ON CONFLICT DO NOTHING';

      try {
        await query(insertQuery, values);
      } catch (dbError) {
        console.warn('Database insert warning:', dbError);
        // Don't fail the response if database insert fails
      }
    }

    res.json({
      success: true,
      data: {
        species,
        predictions,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('LSTM forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate LSTM forecast',
    });
  }
});

// Get random forest predictions (environmental conditions → abundance)
router.post('/predict/random-forest', async (req: Request, res: Response) => {
  try {
    const { temperature, salinity, ph, oxygen } = req.body;

    if (
      temperature === undefined ||
      salinity === undefined ||
      ph === undefined ||
      oxygen === undefined
    ) {
      return res.status(400).json({
        success: false,
        error: 'temperature, salinity, ph, and oxygen required',
      });
    }

    // Call ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/random-forest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature,
        salinity,
        ph,
        oxygen,
      }),
    });

    if (!mlResponse.ok) {
      throw new Error('ML service unavailable');
    }

    const prediction = await mlResponse.json();

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Random forest prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate random forest prediction',
    });
  }
});

// Get regression predictions
router.post('/predict/regression', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({
        success: false,
        error: 'data array required',
      });
    }

    // Call ML service
    const mlResponse = await fetch(`${ML_SERVICE_URL}/predict/regression`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    });

    if (!mlResponse.ok) {
      throw new Error('ML service unavailable');
    }

    const prediction = await mlResponse.json();

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Regression prediction error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate regression prediction',
    });
  }
});

// Get forecast stats/summary
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT species) as species_count,
        COUNT(*) as total_forecasts,
        MIN(forecast_date) as earliest_forecast,
        MAX(forecast_date) as latest_forecast,
        AVG(predicted_abundance) as avg_abundance,
        MAX(predicted_abundance) as max_abundance,
        MIN(predicted_abundance) as min_abundance
      FROM forecasts
    `);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Forecast stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecast stats' });
  }
});

// Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Check ML service
    const mlHealthResponse = await fetch(`${ML_SERVICE_URL}/health`).catch(() => null);

    const mlHealthy = mlHealthResponse?.ok || false;

    res.json({
      success: true,
      service: 'forecast',
      status: 'ok',
      ml_service: mlHealthy ? 'connected' : 'unavailable',
    });
  } catch (error) {
    res.json({
      success: true,
      service: 'forecast',
      status: 'ok',
      ml_service: 'unavailable',
    });
  }
});

export default router;
