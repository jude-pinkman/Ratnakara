"""
eDNA Mock Data Generator
Generates smart eDNA data based on fisheries abundance
"""
import pandas as pd
import random
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class EDNAMockGenerator:
    """Generates mock eDNA data correlated with fisheries abundance"""

    SPECIES_MAPPING = {
        "Tuna": "Thunnus albacares",
        "Skipjack Tuna": "Katsuwonus pelamis",
        "Yellowfin Tuna": "Thunnus albacares",
        "Sardine": "Sardinella longiceps",
        "Mackerel": "Scomberomorus guttatus",
    }

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def fetch_recent_fisheries_data(self) -> pd.DataFrame:
        """Fetch recent fisheries data to base eDNA on"""
        query = """
            SELECT
                species,
                latitude,
                longitude,
                recorded_at,
                abundance
            FROM fisheries_data
            WHERE recorded_at >= NOW() - INTERVAL '24 hours'
            ORDER BY recorded_at DESC
            LIMIT 100
        """

        with Session(self.engine) as session:
            result = session.execute(text(query))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df

    def generate_edna_data(self, fisheries_df: pd.DataFrame) -> pd.DataFrame:
        """Generate mock eDNA data based on fisheries abundance"""
        if fisheries_df.empty:
            logger.warning("No fisheries data available for eDNA generation")
            return pd.DataFrame()

        edna_records = []

        for _, row in fisheries_df.iterrows():
            # Map common name to scientific name
            scientific_name = self.SPECIES_MAPPING.get(
                row['species'],
                "Thunnus albacares"  # default
            )

            # Calculate concentration based on abundance
            # Higher abundance = higher eDNA concentration
            abundance = row['abundance']
            base_concentration = abundance / 200.0

            # Add some random variation
            concentration = base_concentration * random.uniform(0.8, 1.2)
            concentration = round(min(concentration, 1.0), 3)  # Cap at 1.0

            # Confidence is typically high for well-studied species
            confidence = round(random.uniform(0.80, 0.95), 2)

            # Depth varies by species
            depth = random.choice([10, 20, 30, 50])

            record = {
                "species": scientific_name,
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "recorded_at": row["recorded_at"],
                "concentration": concentration,
                "confidence": confidence,
                "depth": depth,
                "source": "MOCK",
            }

            edna_records.append(record)

        return pd.DataFrame(edna_records)

    def store_edna_data(self, df: pd.DataFrame) -> int:
        """Store eDNA data in database"""
        if df.empty:
            return 0

        df.to_sql(
            "edna_data",
            self.engine,
            if_exists='append',
            index=False,
            method='multi'
        )

        logger.info(f"Inserted {len(df)} eDNA records")
        return len(df)

    def run(self) -> dict:
        """Run the complete eDNA generation pipeline"""
        logger.info("Starting eDNA mock generation pipeline")

        try:
            # Fetch recent fisheries data
            fisheries_df = self.fetch_recent_fisheries_data()

            if fisheries_df.empty:
                logger.warning("No fisheries data available, skipping eDNA generation")
                return {
                    "status": "skipped",
                    "data_type": "edna",
                    "records_ingested": 0,
                    "message": "No fisheries data available"
                }

            # Generate mock eDNA data
            edna_df = self.generate_edna_data(fisheries_df)

            # Store in database
            records_count = self.store_edna_data(edna_df)

            # Log the ingestion
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, created_at)
                    VALUES ('edna', 'MOCK', 'success', :count, :now)
                """), {"count": records_count, "now": datetime.now(timezone.utc)})
                session.commit()

            logger.info(f"eDNA generation completed. Records: {records_count}")

            return {
                "status": "success",
                "data_type": "edna",
                "records_ingested": records_count,
                "source": "MOCK"
            }

        except Exception as e:
            logger.error(f"eDNA generation failed: {e}")
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, message, created_at)
                    VALUES ('edna', 'MOCK', 'failed', 0, :msg, :now)
                """), {"msg": str(e), "now": datetime.now(timezone.utc)})
                session.commit()

            return {
                "status": "failed",
                "data_type": "edna",
                "records_ingested": 0,
                "error": str(e)
            }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generator = EDNAMockGenerator("postgresql://user:pass@localhost:5432/marine_data")
    result = generator.run()
    print(result)
