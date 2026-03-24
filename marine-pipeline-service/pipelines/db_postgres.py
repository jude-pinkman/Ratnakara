"""
PostgreSQL Schema and Database Integration for Deep DNAshape
Stores predictions, species classifications, and ecological metrics
Uses Neon PostgreSQL with environment variables for connection
"""

import os
from typing import Dict, List, Optional
from datetime import datetime
import json
import logging

# Attempt to import psycopg2, with fallback
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor, execute_values
    PSYCOPG2_AVAILABLE = True
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logging.warning('psycopg2 not installed. Database functionality disabled.')

logger = logging.getLogger(__name__)


class PostgreSQLDatabase:
    """
    PostgreSQL database interface for Neon DB
    Handles connection, schema creation, and data operations
    """

    def __init__(self):
        """Initialize database connection from environment variables"""
        self.connection_string = os.getenv(
            'DATABASE_URL',
            'postgresql://user:password@localhost:5432/dna_shape'
        )
        self.connected = False

        if PSYCOPG2_AVAILABLE:
            self.connect()

    def connect(self) -> bool:
        """Establish database connection"""
        try:
            self.conn = psycopg2.connect(self.connection_string)
            self.connected = True
            logger.info('Connected to PostgreSQL database')
            return True
        except Exception as e:
            logger.error(f'Database connection failed: {str(e)}')
            self.connected = False
            return False

    def disconnect(self):
        """Close database connection"""
        if self.connected and self.conn:
            self.conn.close()
            self.connected = False

    def create_schema(self) -> bool:
        """Create necessary tables and indexes"""
        if not self.connected:
            return False

        try:
            cursor = self.conn.cursor()

            # Create deep_dna_shape_results table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS deep_dna_shape_results (
                    id SERIAL PRIMARY KEY,
                    sequence_id VARCHAR(50) NOT NULL,
                    sequence TEXT NOT NULL,
                    feature VARCHAR(20) NOT NULL,
                    layer INT DEFAULT 4,
                    fluctuation BOOLEAN DEFAULT FALSE,
                    predictions JSONB NOT NULL,
                    statistics JSONB NOT NULL,
                    confidence FLOAT,
                    processing_time_ms FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_feature (feature),
                    INDEX idx_sequence (sequence),
                    INDEX idx_created_at (created_at)
                )
            ''')

            # Create species_classification table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS species_classification (
                    id SERIAL PRIMARY KEY,
                    sequence_id VARCHAR(50) NOT NULL,
                    sequence TEXT NOT NULL,
                    species VARCHAR(100),
                    probability FLOAT,
                    confidence FLOAT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sequence_id) REFERENCES deep_dna_shape_results(sequence_id),
                    INDEX idx_species (species),
                    INDEX idx_created_at (created_at)
                )
            ''')

            # Create ecological_metrics table
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS ecological_metrics (
                    id SERIAL PRIMARY KEY,
                    batch_id VARCHAR(50) NOT NULL,
                    biodiversity_index FLOAT,
                    species_richness INT,
                    anomaly_score FLOAT,
                    dominant_cluster VARCHAR(50),
                    nucleotide_composition JSONB,
                    sequence_count INT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_batch_id (batch_id),
                    INDEX idx_created_at (created_at)
                )
            ''')

            self.conn.commit()
            logger.info('Database schema created successfully')
            return True

        except Exception as e:
            logger.error(f'Schema creation failed: {str(e)}')
            self.conn.rollback()
            return False
        finally:
            cursor.close()

    def save_prediction(
        self,
        sequence_id: str,
        sequence: str,
        feature: str,
        layer: int,
        fluctuation: bool,
        predictions: List[Dict],
        statistics: Dict,
        confidence: float,
        processing_time_ms: float,
    ) -> Optional[int]:
        """Save prediction result to database"""
        if not self.connected:
            logger.warning('Database not connected, skipping save')
            return None

        try:
            cursor = self.conn.cursor()

            cursor.execute(
                '''
                INSERT INTO deep_dna_shape_results
                (sequence_id, sequence, feature, layer, fluctuation, predictions, statistics, confidence, processing_time_ms)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                ''',
                (
                    sequence_id,
                    sequence,
                    feature,
                    layer,
                    fluctuation,
                    json.dumps(predictions),
                    json.dumps(statistics),
                    confidence,
                    processing_time_ms,
                ),
            )

            record_id = cursor.fetchone()[0]
            self.conn.commit()
            logger.info(f'Saved prediction {record_id}')
            return record_id

        except Exception as e:
            logger.error(f'Failed to save prediction: {str(e)}')
            self.conn.rollback()
            return None
        finally:
            cursor.close()

    def save_species_classification(
        self, sequence_id: str, sequence: str, species: str, probability: float, confidence: float
    ) -> Optional[int]:
        """Save species classification result"""
        if not self.connected:
            return None

        try:
            cursor = self.conn.cursor()

            cursor.execute(
                '''
                INSERT INTO species_classification
                (sequence_id, sequence, species, probability, confidence)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                ''',
                (sequence_id, sequence, species, probability, confidence),
            )

            record_id = cursor.fetchone()[0]
            self.conn.commit()
            return record_id

        except Exception as e:
            logger.error(f'Failed to save species classification: {str(e)}')
            self.conn.rollback()
            return None
        finally:
            cursor.close()

    def save_ecological_metrics(
        self,
        batch_id: str,
        biodiversity_index: float,
        species_richness: int,
        anomaly_score: float,
        dominant_cluster: str,
        nucleotide_composition: Dict,
        sequence_count: int,
    ) -> Optional[int]:
        """Save ecological metrics"""
        if not self.connected:
            return None

        try:
            cursor = self.conn.cursor()

            cursor.execute(
                '''
                INSERT INTO ecological_metrics
                (batch_id, biodiversity_index, species_richness, anomaly_score, dominant_cluster, nucleotide_composition, sequence_count)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                RETURNING id
                ''',
                (
                    batch_id,
                    biodiversity_index,
                    species_richness,
                    anomaly_score,
                    dominant_cluster,
                    json.dumps(nucleotide_composition),
                    sequence_count,
                ),
            )

            record_id = cursor.fetchone()[0]
            self.conn.commit()
            return record_id

        except Exception as e:
            logger.error(f'Failed to save ecological metrics: {str(e)}')
            self.conn.rollback()
            return None
        finally:
            cursor.close()

    def get_predictions(self, feature: str, limit: int = 100) -> List[Dict]:
        """Retrieve predictions for a feature"""
        if not self.connected:
            return []

        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute(
                '''
                SELECT id, sequence_id, sequence, feature, layer, predictions, statistics, confidence, created_at
                FROM deep_dna_shape_results
                WHERE feature = %s
                ORDER BY created_at DESC
                LIMIT %s
                ''',
                (feature, limit),
            )

            results = cursor.fetchall()
            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f'Failed to retrieve predictions: {str(e)}')
            return []
        finally:
            cursor.close()

    def get_species_distribution(self, days: int = 30) -> List[Dict]:
        """Get species distribution for time period"""
        if not self.connected:
            return []

        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute(
                '''
                SELECT species, COUNT(*) as count, AVG(probability) as avg_probability
                FROM species_classification
                WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '%s days'
                GROUP BY species
                ORDER BY count DESC
                ''',
                (days,),
            )

            results = cursor.fetchall()
            return [dict(row) for row in results]

        except Exception as e:
            logger.error(f'Failed to retrieve species distribution: {str(e)}')
            return []
        finally:
            cursor.close()

    def get_ecological_summary(self, days: int = 30) -> Dict:
        """Get ecological metrics summary"""
        if not self.connected:
            return {}

        try:
            cursor = self.conn.cursor(cursor_factory=RealDictCursor)

            cursor.execute(
                '''
                SELECT
                    AVG(biodiversity_index) as avg_biodiversity,
                    AVG(species_richness) as avg_richness,
                    AVG(anomaly_score) as avg_anomaly,
                    COUNT(*) as batch_count
                FROM ecological_metrics
                WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '%s days'
                ''',
                (days,),
            )

            result = cursor.fetchone()
            return dict(result) if result else {}

        except Exception as e:
            logger.error(f'Failed to retrieve ecological summary: {str(e)}')
            return {}
        finally:
            cursor.close()

    def cleanup_old_records(self, days: int = 90) -> int:
        """Delete records older than specified days"""
        if not self.connected:
            return 0

        try:
            cursor = self.conn.cursor()

            cursor.execute(
                '''
                DELETE FROM deep_dna_shape_results
                WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '%s days'
                ''',
                (days,),
            )

            deleted = cursor.rowcount
            self.conn.commit()
            logger.info(f'Deleted {deleted} old records')
            return deleted

        except Exception as e:
            logger.error(f'Failed to cleanup records: {str(e)}')
            self.conn.rollback()
            return 0
        finally:
            cursor.close()


# Singleton instance
_db_instance: Optional[PostgreSQLDatabase] = None


def get_database() -> PostgreSQLDatabase:
    """Get or create database instance"""
    global _db_instance
    if _db_instance is None:
        _db_instance = PostgreSQLDatabase()
    return _db_instance
