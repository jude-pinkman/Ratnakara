import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import localApiRoutes from './routes/localApi.js';
import ednaShapeAnalyzerRoutes from './routes/ednaShapeAnalyzer.js';
import otolithRoutes from './routes/otolith.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.0.0',
    services: {
      api: 'operational',
      dataSource: 'local-in-memory',
      database: 'removed'
    }
  });
});

app.use('/api', localApiRoutes);

// Deep eDNA Shape Analyzer routes
app.use('/api/edna-shape', ednaShapeAnalyzerRoutes);
app.use('/api/otolith', otolithRoutes);

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

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log('Mode: Local API (database-free)');
});
