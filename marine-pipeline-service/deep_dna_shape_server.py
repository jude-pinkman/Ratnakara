"""
Deep DNAshape FastAPI Server
Standalone Python service for DNA shape predictions
Can be run with: uvicorn deep_dna_shape_server:app --host 0.0.0.0 --port 8001
"""

import sys
import os
from typing import List
import logging

# Add pipeline directory to path
ROOT_DIR = os.path.dirname(__file__)
sys.path.insert(0, ROOT_DIR)
sys.path.insert(0, os.path.join(ROOT_DIR, 'pipelines'))

from pipelines.deep_dna_shape_pipeline import (
    predict,
    SpeciesClassifier,
    EcologicalMetrics,
    generate_csv_from_predictions,
)
from pipelines.db_postgres import get_database

# Try to import FastAPI (optional - can run without it)
try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Pydantic models
class PredictRequest(BaseModel):
    sequences: List[str]
    feature: str
    layer: int = 4
    fluctuation: bool = False
    mode: str = 'predict'


class PredictResponse(BaseModel):
    success: bool
    sequences: List = []
    feature: str = ''
    fluctuation: bool = False
    layer: int = 4
    statistics: dict = {}
    confidence: float = 0.0
    processingTime: float = 0.0
    error: str = ''


# FastAPI app (if available)
if FASTAPI_AVAILABLE:
    app = FastAPI(
        title='Deep DNAshape API',
        description='DNA shape prediction service',
        version='1.0.0',
    )

    @app.get('/health')
    async def health():
        """Health check endpoint"""
        db = get_database()
        return {
            'status': 'operational',
            'service': 'Deep DNAshape',
            'database_connected': db.connected,
        }

    @app.post('/predict', response_model=PredictResponse)
    async def predict_endpoint(request: PredictRequest):
        """Predict DNA shape features"""
        try:
            result = predict(
                sequences=request.sequences,
                feature=request.feature,
                layer=request.layer,
                fluctuation=request.fluctuation,
                mode=request.mode,
            )

            # Save to database if successful
            if result.get('success') and request.mode == 'predict':
                db = get_database()
                for seq in result.get('sequences', []):
                    db.save_prediction(
                        sequence_id=seq['id'],
                        sequence=seq['sequence'],
                        feature=request.feature,
                        layer=request.layer,
                        fluctuation=request.fluctuation,
                        predictions=seq['predictions'],
                        statistics=result.get('statistics', {}),
                        confidence=result.get('confidence', 0.0),
                        processing_time_ms=result.get('processingTime', 0.0),
                    )

            return result

        except Exception as e:
            logger.error(f'Prediction error: {str(e)}')
            raise HTTPException(status_code=500, detail=str(e))

    @app.post('/species-classify')
    async def classify_species(request: PredictRequest):
        """Classify species from sequences"""
        try:
            species_results = SpeciesClassifier.classify(request.sequences)
            return {
                'success': True,
                'species': species_results,
            }
        except Exception as e:
            logger.error(f'Classification error: {str(e)}')
            raise HTTPException(status_code=500, detail=str(e))

    @app.post('/ecological-metrics')
    async def get_ecological_metrics(request: PredictRequest):
        """Calculate ecological metrics"""
        try:
            metrics = EcologicalMetrics.calculate(request.sequences)

            # Save to database
            db = get_database()
            db.save_ecological_metrics(
                batch_id=f'batch_{request.sequences[0][:10] if request.sequences else "empty"}',
                biodiversity_index=metrics['biodiversityIndex'],
                species_richness=metrics['speciesRichness'],
                anomaly_score=metrics['anomalyScore'],
                dominant_cluster=metrics['dominantCluster'],
                sequence_count=len(request.sequences),
            )

            return {
                'success': True,
                'biodiversityIndex': metrics['biodiversityIndex'],
                'speciesRichness': metrics['speciesRichness'],
                'anomalyScore': metrics['anomalyScore'],
                'dominantCluster': metrics['dominantCluster'],
            }
        except Exception as e:
            logger.error(f'Metrics error: {str(e)}')
            raise HTTPException(status_code=500, detail=str(e))

    @app.post('/batch-predict')
    async def batch_predict(request: PredictRequest):
        """Batch predict and return CSV"""
        try:
            result = DeepDNAShapePipeline.predict(
                sequences=request.sequences,
                feature=request.feature,
                layer=request.layer,
                fluctuation=request.fluctuation,
                mode='batch',
            )

            csv_content = generate_csv_from_predictions(result)

            return StreamingResponse(
                iter([csv_content]),
                media_type='text/csv',
                headers={
                    'Content-Disposition': f'attachment; filename="predictions-{request.feature}.csv"'
                },
            )

        except Exception as e:
            logger.error(f'Batch predict error: {str(e)}')
            raise HTTPException(status_code=500, detail=str(e))


# Fallback non-FastAPI server
else:
    logger.warning('FastAPI not installed. Using basic HTTP server.')

    from http.server import HTTPServer, BaseHTTPRequestHandler
    import json

    class PredictionHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            if self.path == '/predict':
                content_length = int(self.headers.get('Content-Length', 0))
                body = self.rfile.read(content_length)

                try:
                    payload = json.loads(body.decode())

                    result = DeepDNAShapePipeline.predict(
                        sequences=payload.get('sequences', []),
                        feature=payload.get('feature', 'MGW'),
                        layer=payload.get('layer', 4),
                        fluctuation=payload.get('fluctuation', False),
                    )

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps(result).encode())

                except Exception as e:
                    self.send_response(500)
                    self.send_header('Content-Type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())

            elif self.path == '/health':
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(
                    json.dumps({
                        'status': 'operational',
                        'service': 'Deep DNAshape',
                    }).encode()
                )

        def log_message(self, format, *args):
            logger.info(format % args)

    def run_server():
        server = HTTPServer(('0.0.0.0', 8001), PredictionHandler)
        logger.info('Deep DNAshape server running on port 8001')
        server.serve_forever()


# Entry point
if __name__ == '__main__':
    if FASTAPI_AVAILABLE:
        import uvicorn

        logger.info('Starting Deep DNAshape FastAPI server...')
        uvicorn.run(app, host='0.0.0.0', port=8001, log_level='info')
    else:
        run_server()
