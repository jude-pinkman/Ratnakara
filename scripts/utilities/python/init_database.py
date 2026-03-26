#!/usr/bin/env python3
"""
Database Initialization and Connection Test
Prepares Neon database for data ingestion
"""

import os
import sys
from pathlib import Path
import psycopg2
import logging
import subprocess
from dotenv import load_dotenv
from datetime import datetime

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / "marine-pipeline-service" / ".env")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def parse_db_url(db_url: str) -> dict:
    """Parse PostgreSQL connection string"""
    try:
        # Format: postgresql://user:password@host:port/database?params
        from urllib.parse import urlparse
        parsed = urlparse(db_url)

        return {
            'host': parsed.hostname,
            'port': parsed.port or 5432,
            'database': parsed.path.lstrip('/').split('?')[0],
            'user': parsed.username,
            'password': parsed.password,
            'sslmode': 'require'
        }
    except Exception as e:
        logger.error(f"Failed to parse DATABASE_URL: {e}")
        return None


def test_connection(db_config: dict) -> bool:
    """Test database connection"""
    try:
        logger.info(f"Connecting to {db_config['host']}:{db_config['port']}/{db_config['database']}...")

        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database'],
            user=db_config['user'],
            password=db_config['password'],
            sslmode=db_config['sslmode']
        )

        cursor = conn.cursor()
        cursor.execute("SELECT NOW();")
        server_time = cursor.fetchone()[0]

        logger.info(f"✓ Connection successful!")
        logger.info(f"  Server time: {server_time}")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        logger.error(f"✗ Connection failed: {e}")
        return False


def check_schema(db_config: dict) -> dict:
    """Check existing schema"""
    try:
        conn = psycopg2.connect(
            host=db_config['host'],
            port=db_config['port'],
            database=db_config['database'],
            user=db_config['user'],
            password=db_config['password'],
            sslmode=db_config['sslmode']
        )

        cursor = conn.cursor()

        # Get list of tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """)
        tables = [row[0] for row in cursor.fetchall()]

        # Get list of extensions
        cursor.execute("SELECT extname FROM pg_extension;")
        extensions = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        return {
            'tables': tables,
            'extensions': extensions
        }

    except Exception as e:
        logger.error(f"Failed to check schema: {e}")
        return None


def initialize_schema(db_config: dict) -> bool:
    """Initialize database schema"""
    try:
        logger.info("Initializing database schema...")

        schema_file = str(ROOT / "marine-pipeline-service" / "schema.sql")

        if not os.path.exists(schema_file):
            logger.error(f"Schema file not found: {schema_file}")
            return False

        # Build the database URL for psql
        db_url = (
            f"postgresql://{db_config['user']}:{db_config['password']}"
            f"@{db_config['host']}:{db_config['port']}/{db_config['database']}"
            f"?sslmode={db_config['sslmode']}"
        )

        # Use psql to execute the schema file
        logger.info("Executing schema via psql...")
        result = subprocess.run(
            ['psql', db_url, '-f', schema_file],
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode == 0:
            logger.info("✓ Schema initialized successfully!")
            return True
        else:
            logger.error(f"Schema execution failed: {result.stderr}")
            return False

    except FileNotFoundError:
        logger.error("psql command not found. Make sure PostgreSQL is installed and in PATH")
        return False
    except subprocess.TimeoutExpired:
        logger.error("Schema initialization timed out")
        return False
    except Exception as e:
        logger.error(f"✗ Schema initialization failed: {e}", exc_info=True)
        return False


def verify_tables(db_config: dict, required_tables: list) -> bool:
    """Verify required tables exist"""
    schema = check_schema(db_config)

    if not schema:
        return False

    existing_tables = schema['tables']
    missing_tables = [t for t in required_tables if t not in existing_tables]

    print("\n" + "="*60)
    print("DATABASE SCHEMA STATUS")
    print("="*60)

    print(f"\n✓ Extensions loaded: {', '.join(schema['extensions'])}")
    print(f"✓ Tables found ({len(existing_tables)}):")
    for table in sorted(existing_tables):
        print(f"    • {table}")

    if missing_tables:
        print(f"\n✗ Missing tables ({len(missing_tables)}):")
        for table in missing_tables:
            print(f"    • {table}")
        return False
    else:
        print(f"\n✓ All required tables present")
        return True


def main():
    """Main initialization routine"""
    db_url = os.getenv("DATABASE_URL")

    if not db_url:
        logger.error("ERROR: DATABASE_URL not set in .env")
        sys.exit(1)

    logger.info(f"Database URL: {db_url[:50]}...")

    # Parse connection string
    db_config = parse_db_url(db_url)
    if not db_config:
        sys.exit(1)

    # Test connection
    if not test_connection(db_config):
        logger.info("\nTrying to initialize schema...")
        if not initialize_schema(db_config):
            sys.exit(1)
        # Try connection again
        if not test_connection(db_config):
            sys.exit(1)

    # Define required tables
    required_tables = [
        "taxonomy",
        "ocean_data",
        "fisheries_data",
        "edna_data",
        "correlations",
        "forecasts",
        "ingestion_logs"
    ]

    # Check/initialize schema
    schema = check_schema(db_config)
    if schema and len(schema['tables']) < len(required_tables):
        logger.info("Schema incomplete. Running initialization...")
        initialize_schema(db_config)

    # Verify tables
    success = verify_tables(db_config, required_tables)

    if success:
        logger.info("\n✓ Database is ready!")
        logger.info("\nNext steps:")
        logger.info("  1. cd marine-pipeline-service")
        logger.info("  2. python run_pipeline.py all")
        logger.info("\nThen visit: http://localhost:3000")
        sys.exit(0)
    else:
        logger.error("\n✗ Database initialization incomplete")
        sys.exit(1)


if __name__ == "__main__":
    main()
