"""
Quick run script for testing individual pipelines
"""
import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Set UTF-8 encoding for output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/marine_data"
)


def run_noaa():
    """Test NOAA pipeline"""
    from pipelines.noaa_pipeline import NOAAPipeline
    pipeline = NOAAPipeline(DATABASE_URL)
    result = pipeline.run()
    print(f"\n[OK] NOAA Result: {result}\n")


def run_fisheries():
    """Test Fisheries generator"""
    from pipelines.fisheries_generator import FisheriesMockGenerator
    generator = FisheriesMockGenerator(DATABASE_URL)
    result = generator.run()
    print(f"\n[OK] Fisheries Result: {result}\n")


def run_edna():
    """Test eDNA generator"""
    from pipelines.edna_generator import EDNAMockGenerator
    generator = EDNAMockGenerator(DATABASE_URL)
    result = generator.run()
    print(f"\n[OK] eDNA Result: {result}\n")


def run_taxonomy():
    """Test Taxonomy fetcher"""
    from pipelines.taxonomy_fetcher import TaxonomyFetcher
    fetcher = TaxonomyFetcher(DATABASE_URL)
    result = fetcher.run()
    print(f"\n[OK] Taxonomy Result: {result}\n")


def run_correlation():
    """Test Correlation generator"""
    from pipelines.correlation_generator import CorrelationGenerator
    generator = CorrelationGenerator(DATABASE_URL)
    result = generator.run()
    print(f"\n[OK] Correlation Result: {result}\n")


def run_all():
    """Run all pipelines in sequence"""
    print("\n" + "=" * 80)
    print("Running all pipelines in sequence...")
    print("=" * 80 + "\n")

    run_noaa()
    run_fisheries()
    run_edna()
    run_correlation()
    run_taxonomy()

    print("=" * 80)
    print("All pipelines completed!")
    print("=" * 80 + "\n")


if __name__ == "__main__":
    commands = {
        "noaa": run_noaa,
        "fisheries": run_fisheries,
        "edna": run_edna,
        "taxonomy": run_taxonomy,
        "correlation": run_correlation,
        "all": run_all,
    }

    if len(sys.argv) < 2 or sys.argv[1] not in commands:
        print("Usage: python run_pipeline.py [command]")
        print("\nCommands:")
        print("  noaa         - Run NOAA ocean data pipeline")
        print("  fisheries    - Run fisheries mock generator")
        print("  edna         - Run eDNA mock generator")
        print("  taxonomy     - Run taxonomy fetcher")
        print("  correlation  - Run correlation generator")
        print("  all          - Run all pipelines in sequence")
        sys.exit(1)

    command = sys.argv[1]
    commands[command]()
