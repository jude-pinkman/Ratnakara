import { Router, Request, Response } from 'express';

const router = Router();

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

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { species, months } = req.body;

    if (!species || !months) {
      return res.status(400).json({ success: false, error: 'Species and months required' });
    }

    res.json({ success: true, data: [] });
  } catch (error) {
    console.error('Generate forecast error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

export default router;
