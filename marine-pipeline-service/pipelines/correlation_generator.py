"""
Correlation Generator
Generates correlations between ocean conditions and species abundance
"""
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class CorrelationGenerator:
    """Generates correlation data between ocean conditions and fisheries"""

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def fetch_combined_data(self) -> pd.DataFrame:
        """Fetch ocean and fisheries data for correlation analysis"""
        query = """
            SELECT DISTINCT ON (f.species, o.temperature)
                f.species,
                o.temperature,
                f.abundance,
                f.recorded_at
            FROM fisheries_data f
            INNER JOIN ocean_data o
                ON ABS(f.latitude - o.latitude) < 1
                AND ABS(f.longitude - o.longitude) < 1
                AND f.recorded_at BETWEEN o.recorded_at - INTERVAL '1 hour' AND o.recorded_at + INTERVAL '1 hour'
            WHERE o.temperature IS NOT NULL
                AND f.recorded_at >= NOW() - INTERVAL '7 days'
            ORDER BY f.species, o.temperature, f.recorded_at DESC
            LIMIT 1000
        """

        with Session(self.engine) as session:
            result = session.execute(text(query))
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df

    def calculate_correlations(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate correlations for each species"""
        if df.empty:
            logger.warning("No data available for correlation calculation")
            return pd.DataFrame()

        correlations = []

        # Group by species
        for species, group in df.groupby('species'):
            if len(group) < 5:  # Need at least 5 data points
                continue

            # Calculate correlation between temperature and abundance
            temp_corr = group[['temperature', 'abundance']].corr().iloc[0, 1]
            correlation_coefficient = round(temp_corr, 3)

            # Get average values
            avg_temp = round(group['temperature'].mean(), 2)
            avg_abundance = int(group['abundance'].mean())

            record = {
                "species": species,
                "temperature": avg_temp,
                "salinity": None,  # Not available from NOAA
                "abundance": avg_abundance,
                "correlation_coefficient": correlation_coefficient,
                "computed_at": datetime.now(timezone.utc),
            }

            correlations.append(record)

        return pd.DataFrame(correlations)

    def store_correlations(self, df: pd.DataFrame) -> int:
        """Store correlation data in database"""
        if df.empty:
            return 0

        # Clear old correlations (keep correlations fresh)
        with Session(self.engine) as session:
            session.execute(text("DELETE FROM correlations WHERE computed_at < NOW() - INTERVAL '7 days'"))
            session.commit()

        # Insert new correlations
        df.to_sql(
            "correlations",
            self.engine,
            if_exists='append',
            index=False,
            method='multi'
        )

        logger.info(f"Inserted {len(df)} correlation records")
        return len(df)

    def run(self) -> dict:
        """Run the complete correlation generation pipeline"""
        logger.info("Starting correlation generation pipeline")

        try:
            # Fetch combined data
            combined_df = self.fetch_combined_data()

            if combined_df.empty:
                logger.warning("No data available for correlation calculation")
                return {
                    "status": "skipped",
                    "data_type": "correlation",
                    "records_ingested": 0,
                    "message": "No data available"
                }

            # Calculate correlations
            correlations_df = self.calculate_correlations(combined_df)

            # Store in database
            records_count = self.store_correlations(correlations_df)

            # Log the ingestion
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, created_at)
                    VALUES ('correlation', 'COMPUTED', 'success', :count, :now)
                """), {"count": records_count, "now": datetime.now(timezone.utc)})
                session.commit()

            logger.info(f"Correlation generation completed. Records: {records_count}")

            return {
                "status": "success",
                "data_type": "correlation",
                "records_ingested": records_count,
                "source": "COMPUTED"
            }

        except Exception as e:
            logger.error(f"Correlation generation failed: {e}")
            with Session(self.engine) as session:
                session.execute(text("""
                    INSERT INTO ingestion_logs (data_type, source, status, records_ingested, message, created_at)
                    VALUES ('correlation', 'COMPUTED', 'failed', 0, :msg, :now)
                """), {"msg": str(e), "now": datetime.now(timezone.utc)})
                session.commit()

            return {
                "status": "failed",
                "data_type": "correlation",
                "records_ingested": 0,
                "error": str(e)
            }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    generator = CorrelationGenerator("postgresql://user:pass@localhost:5432/marine_data")
    result = generator.run()
    print(result)
