"""
Main Pipeline Orchestrator with Scheduler
Coordinates all data pipelines in the correct order
"""
import schedule
import time
import logging
import os
import psycopg2
import subprocess
from datetime import datetime
from dotenv import load_dotenv
from urllib.parse import urlparse

from pipelines.noaa_pipeline import NOAAPipeline
from pipelines.fisheries_generator import FisheriesMockGenerator
from pipelines.edna_generator import EDNAMockGenerator
from pipelines.taxonomy_fetcher import TaxonomyFetcher
from pipelines.correlation_generator import CorrelationGenerator

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pipeline_orchestrator.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


def ensure_schema_exists(database_url: str) -> bool:
    """Initialize database schema if it doesn't exist"""
    try:
        # Parse connection string
        parsed = urlparse(database_url)
        config = {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/').split('?')[0],
            'user': parsed.username,
            'password': parsed.password,
            'sslmode': 'require'
        }

        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database=config['database'],
            user=config['user'],
            password=config['password'],
            sslmode=config['sslmode']
        )

        cursor = conn.cursor()

        # Check if ingestion_logs table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = 'ingestion_logs'
            );
        """)

        table_exists = cursor.fetchone()[0]
        cursor.close()
        conn.close()

        if not table_exists:
            logger.info("Database schema missing. Initializing via psql...")

            # Build database URL for psql
            full_db_url = (
                f"postgresql://{config['user']}:{config['password']}"
                f"@{config['host']}:{config['port']}/{config['database']}"
                f"?sslmode={config['sslmode']}"
            )

            schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
            if not os.path.exists(schema_path):
                logger.error(f"Schema file not found: {schema_path}")
                return False

            # Use psql to execute schema
            result = subprocess.run(
                ['psql', full_db_url, '-f', schema_path],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode == 0:
                logger.info("✓ Database schema initialized successfully")
                return True
            else:
                logger.error(f"Schema execution failed: {result.stderr}")
                return False

        return True

    except FileNotFoundError:
        logger.error("psql command not found. Make sure PostgreSQL is installed.")
        return False
    except subprocess.TimeoutExpired:
        logger.error("Schema initialization timed out")
        return False
    except Exception as e:
        logger.error(f"Failed to initialize schema: {e}", exc_info=True)
        return False


class PipelineOrchestrator:
    """Orchestrates all data pipelines in the correct sequence"""

    def __init__(self, database_url: str):
        self.database_url = database_url
        self.noaa_pipeline = NOAAPipeline(database_url)
        self.fisheries_generator = FisheriesMockGenerator(database_url)
        self.edna_generator = EDNAMockGenerator(database_url)
        self.taxonomy_fetcher = TaxonomyFetcher(database_url)
        self.correlation_generator = CorrelationGenerator(database_url)

    def run_full_pipeline(self):
        """
        Run the complete pipeline in sequence:
        1. NOAA ocean data (real)
        2. Mock fisheries data (based on ocean)
        3. Mock eDNA data (based on fisheries)
        4. Correlations (based on ocean + fisheries)
        """
        logger.info("=" * 80)
        logger.info(f"Starting full pipeline execution at {datetime.now()}")
        logger.info("=" * 80)

        results = {}

        try:
            # Step 1: Fetch NOAA ocean data (REAL)
            logger.info("\n[1/5] Fetching NOAA ocean data...")
            results['noaa'] = self.noaa_pipeline.run()
            logger.info(f"✓ NOAA: {results['noaa']}")

            # Step 2: Generate mock fisheries data
            logger.info("\n[2/5] Generating fisheries data...")
            results['fisheries'] = self.fisheries_generator.run()
            logger.info(f"✓ Fisheries: {results['fisheries']}")

            # Step 3: Generate mock eDNA data
            logger.info("\n[3/5] Generating eDNA data...")
            results['edna'] = self.edna_generator.run()
            logger.info(f"✓ eDNA: {results['edna']}")

            # Step 4: Generate correlations
            logger.info("\n[4/5] Generating correlations...")
            results['correlation'] = self.correlation_generator.run()
            logger.info(f"✓ Correlation: {results['correlation']}")

            # Step 5: Fetch taxonomy (once per day is enough)
            logger.info("\n[5/5] Updating taxonomy...")
            results['taxonomy'] = self.taxonomy_fetcher.run()
            logger.info(f"✓ Taxonomy: {results['taxonomy']}")

            logger.info("\n" + "=" * 80)
            logger.info("Pipeline execution completed successfully!")
            logger.info(f"Total records ingested:")
            logger.info(f"  - Ocean: {results['noaa'].get('records_ingested', 0)}")
            logger.info(f"  - Fisheries: {results['fisheries'].get('records_ingested', 0)}")
            logger.info(f"  - eDNA: {results['edna'].get('records_ingested', 0)}")
            logger.info(f"  - Correlations: {results['correlation'].get('records_ingested', 0)}")
            logger.info(f"  - Taxonomy: {results['taxonomy'].get('records_ingested', 0)}")
            logger.info("=" * 80 + "\n")

        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}", exc_info=True)

        return results

    def run_hourly_pipeline(self):
        """Run only the pipelines that need to update hourly"""
        logger.info("Running hourly pipeline update...")

        try:
            # NOAA data
            self.noaa_pipeline.run()

            # Fisheries (based on new ocean data)
            self.fisheries_generator.run()

            # eDNA (based on new fisheries data)
            self.edna_generator.run()

            # Correlations (based on updated data)
            self.correlation_generator.run()

            logger.info("Hourly pipeline completed successfully\n")

        except Exception as e:
            logger.error(f"Hourly pipeline failed: {e}", exc_info=True)

    def run_daily_pipeline(self):
        """Run pipelines that only need daily updates"""
        logger.info("Running daily pipeline update...")

        try:
            # Taxonomy (doesn't change often)
            self.taxonomy_fetcher.run()

            logger.info("Daily pipeline completed successfully\n")

        except Exception as e:
            logger.error(f"Daily pipeline failed: {e}", exc_info=True)


def main():
    """Main entry point with scheduler"""
    database_url = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/marine_data"
    )

    logger.info("Initializing Pipeline Orchestrator")
    logger.info(f"Database: {database_url.split('@')[1] if '@' in database_url else 'localhost'}")

    # Ensure database schema exists
    if not ensure_schema_exists(database_url):
        logger.error("Failed to initialize database schema. Exiting.")
        return

    orchestrator = PipelineOrchestrator(database_url)

    # Run once immediately on startup
    logger.info("Running initial pipeline...")
    orchestrator.run_full_pipeline()

    # Schedule hourly runs
    schedule.every(1).hours.do(orchestrator.run_hourly_pipeline)

    # Schedule daily taxonomy updates
    schedule.every().day.at("02:00").do(orchestrator.run_daily_pipeline)

    logger.info("\nScheduler configured:")
    logger.info("  - Hourly: NOAA → Fisheries → eDNA → Correlations")
    logger.info("  - Daily (02:00): Taxonomy updates")
    logger.info("\nScheduler started. Press Ctrl+C to stop.\n")

    # Run scheduled tasks
    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except KeyboardInterrupt:
        logger.info("\nScheduler stopped by user")


if __name__ == "__main__":
    main()
