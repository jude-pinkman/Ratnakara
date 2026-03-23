"""
Mock Fisheries Data Generator
Generates scientifically realistic fisheries data based on ocean conditions
"""
import pandas as pd
import random
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class FisheriesMockGenerator:
    """Generates mock fisheries data correlated with ocean conditions"""

    SPECIES_REGIONS = [
        {"species": "Tuna", "region": "Arabian Sea", "temp_range": (24, 30)},
        {"species": "Skipjack Tuna", "region": "Pacific Ocean", "temp_range": (20, 28)},
        {"species": "Yellowfin Tuna", "region": "Indian Ocean", "temp_range": (22, 29)},
        {"species": "Sardine", "region": "Mediterranean Sea", "temp_range": (15, 22)},
        {"species": "Mackerel", "region": "Atlantic Ocean", "temp_range": (10, 20)},
    ]

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def fetch_recent_ocean_data(self) -> pd.DataFrame:
        """Fetch recent ocean data to base mock data on"""
        query = """
            SELECT
                latitude,
                longitude,
                recorded_at,
                temperature,
                salinity
            FROM ocean_data
            ORDER BY recorded_at DESC
            LIMIT 500
        """

        with Session(self.engine) as session:
            result = session.execute(text(query))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df

    def generate_fisheries_data(self, ocean_df: pd.DataFrame) -> pd.DataFrame:
        """Generate mock fisheries data based on ocean conditions"""
        if ocean_df.empty:
            logger.warning("No ocean data available for fisheries generation")
            return pd.DataFrame()

        fisheries_records = []

        for _, ocean_row in ocean_df.iterrows():
            temp = ocean_row.get('temperature')
            wind_speed = ocean_row.get('wind_speed')

            # Use wind speed as proxy if temperature unavailable
            if pd.isna(temp) and pd.notna(wind_speed):
                temp = 15 + (wind_speed / 2)  # Rough conversion: 1 m/s wind ≈ 0.5°C

            # Select species appropriate for this temperature
            suitable_species = [
                sp for sp in self.SPECIES_REGIONS
                if pd.notna(temp) and sp['temp_range'][0] <= temp <= sp['temp_range'][1]
            ]

            if not suitable_species:
                # Default to a set of species if none match
                suitable_species = self.SPECIES_REGIONS

            species_info = random.choice(suitable_species)

            # Generate abundance (use random if no temp data)
            if pd.notna(temp):
                optimal_temp = sum(species_info['temp_range']) / 2
                temp_factor = 1 - abs(temp - optimal_temp) / 10
                temp_factor = max(0.2, min(temp_factor, 1.0))
                base_abundance = random.randint(80, 150)
                abundance = int(base_abundance * temp_factor)
            else:
                abundance = random.randint(50, 150)

            # Generate related metrics
            biomass = abundance * random.uniform(2.0, 3.5)
            diversity_index = random.uniform(0.5, 0.9)

            record = {
                "species": species_info["species"],
                "latitude": ocean_row["latitude"],
                "longitude": ocean_row["longitude"],
                "recorded_at": ocean_row["recorded_at"],
                "abundance": abundance,
                "biomass": round(biomass, 2),
                "diversity_index": round(diversity_index, 2),
                "region": species_info["region"],
                "source": "MOCK",
            }

            fisheries_records.append(record)

        return pd.DataFrame(fisheries_records)

    def store_fisheries_data(self, df: pd.DataFrame) -> int:
        """Store fisheries data in database"""
        if df.empty:
            return 0

        df.to_sql(
            "fisheries_data",
            self.engine,
            if_exists='append',
            index=False,
            method='multi'
        )

        logger.info(f"Inserted {len(df)} fisheries records")
        return len(df)

    def run(self) -> dict:
        """Run the complete fisheries generation pipeline"""
        logger.info("Starting fisheries mock generation pipeline")

        try:
            # Fetch recent ocean data
            ocean_df = self.fetch_recent_ocean_data()

            if ocean_df.empty:
                logger.warning("No ocean data available, skipping fisheries generation")
                return {
                    "status": "skipped",
                    "data_type": "fisheries",
                    "records_ingested": 0,
                    "message": "No ocean data available"
                }

            # Generate mock fisheries data
            fisheries_df = self.generate_fisheries_data(ocean_df)

            # Store in database
            records_count = self.store_fisheries_data(fisheries_df)

            # Log the ingestion
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, created_at)
                    VALUES ('fisheries', 'MOCK', 'success', :count, :now)
                """), {"count": records_count, "now": datetime.now(timezone.utc)})
                session.commit()

            logger.info(f"Fisheries generation completed. Records: {records_count}")

            return {
                "status": "success",
                "data_type": "fisheries",
                "records_ingested": records_count,
                "source": "MOCK"
            }

        except Exception as e:
            logger.error(f"Fisheries generation failed: {e}")
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, message, created_at)
                    VALUES ('fisheries', 'MOCK', 'failed', 0, :msg, :now)
                """), {"msg": str(e), "now": datetime.now(timezone.utc)})
                session.commit()

            return {
                "status": "failed",
                "data_type": "fisheries",
                "records_ingested": 0,
                "error": str(e)
            }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generator = FisheriesMockGenerator("postgresql://user:pass@localhost:5432/marine_data")
    result = generator.run()
    print(result)
