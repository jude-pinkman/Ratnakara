import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import oceanRoutes from './routes/ocean.js';
import fisheriesRoutes from './routes/fisheries.js';
import ednaRoutes from './routes/edna.js';
import taxonomyRoutes from './routes/taxonomy.js';
import correlationRoutes from './routes/correlation.js';
import forecastRoutes from './routes/forecast.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/ocean', oceanRoutes);
app.use('/api/fisheries', fisheriesRoutes);
app.use('/api/edna', ednaRoutes);
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/correlation', correlationRoutes);
app.use('/api/forecast', forecastRoutes);

// Chatbot endpoint
app.post('/api/chatbot', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ success: false, error: 'Question required' });
    }

    const response = await fetch('http://localhost:8000/chatbot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ success: false, error: 'Chatbot service unavailable' });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
