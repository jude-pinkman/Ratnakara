import { Router, Request, Response } from 'express';

const router = Router();

const handleLstmForecast = async (req: Request, res: Response) => {
  try {
    const { species, months } = req.body;

    if (!species || !months) {
      return res.status(400).json({ success: false, error: 'species and months required' });
    }

    res.json({
      success: true,
      data: {
        species,
        predictions: [],
        generated_at: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('LSTM forecast error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate LSTM forecast' });
  }
};

router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Forecasts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecasts' });
  }
});

router.get('/species-list', async (req: Request, res: Response) => {
  try {
    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Species list error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch species list' });
  }
});

router.post('/predict/lstm', handleLstmForecast);
router.post('/generate', handleLstmForecast);

router.post('/predict/random-forest', async (req: Request, res: Response) => {
  try {
    const { temperature, salinity, ph, oxygen } = req.body;

    if (temperature === undefined || salinity === undefined || ph === undefined || oxygen === undefined) {
      return res.status(400).json({ success: false, error: 'temperature, salinity, ph, and oxygen required' });
    }

    res.json({ success: true, data: { predicted_abundance: null, confidence: null, model: 'random-forest-v1' } });
  } catch (error: any) {
    console.error('Random forest prediction error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate random forest prediction' });
  }
});

router.post('/predict/regression', async (req: Request, res: Response) => {
  try {
    const { data } = req.body;

    if (!data || !Array.isArray(data)) {
      return res.status(400).json({ success: false, error: 'data array required' });
    }

    res.json({ success: true, data: { predictions: [], confidence_intervals: [], model: 'regression-v1' } });
  } catch (error: any) {
    console.error('Regression prediction error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate regression prediction' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      data: {
        species_count: 0,
        total_forecasts: 0,
        earliest_forecast: null,
        latest_forecast: null,
        avg_abundance: null,
        max_abundance: null,
        min_abundance: null
      }
    });
  } catch (error) {
    console.error('Forecast stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch forecast stats' });
  }
});

router.get('/health', async (req: Request, res: Response) => {
  res.json({ success: true, service: 'forecast', status: 'ok', ml_service: 'disabled' });
});

export default router;
