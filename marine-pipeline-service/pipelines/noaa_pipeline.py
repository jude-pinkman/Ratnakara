"""
NOAA Real-Time Data Ingestion Pipeline
Fetches live ocean data from NDBC buoys
"""
import pandas as pd
import requests
from datetime import datetime, timezone
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import logging
from typing import Dict, List
import urllib3

# Disable SSL warnings for NOAA data fetching
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class NOAAPipeline:
    """Fetches and processes real NOAA buoy data"""

    STATIONS = [
        {"id": "41037", "lat": 27.5, "lon": -75.0, "name": "South of Bermuda"},
        {"id": "41001", "lat": 34.7, "lon": -72.7, "name": "East of Cape Hatteras"},
        {"id": "46050", "lat": 44.7, "lon": -124.5, "name": "Oregon Coast"},
        {"id": "51003", "lat": 19.2, "lon": -160.6, "name": "Hawaii"},
    ]

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def fetch_noaa_buoy(self, station_id: str) -> pd.DataFrame:
        """Fetch real-time data from NOAA NDBC buoy"""
        url = f"https://www.ndbc.noaa.gov/data/realtime2/{station_id}.txt"

        try:
            logger.info(f"Fetching NOAA data from station {station_id}")
            response = requests.get(url, timeout=30, verify=False)
            response.raise_for_status()

            # Parse the text file (space-delimited)
            from io import StringIO
            df = pd.read_csv(StringIO(response.text), delim_whitespace=True, skiprows=[1])

            # Convert time columns to datetime
            df['recorded_at'] = pd.to_datetime(
                df['#YY'].astype(str) + '-' +
                df['MM'].astype(str).str.zfill(2) + '-' +
                df['DD'].astype(str).str.zfill(2) + ' ' +
                df['hh'].astype(str).str.zfill(2) + ':' +
                df['mm'].astype(str).str.zfill(2),
                format='%Y-%m-%d %H:%M',
                errors='coerce'
            )

            # Map columns to our schema
            df['temperature'] = pd.to_numeric(df.get('WTMP', None), errors='coerce')
            # Fallback to air temperature if water temp unavailable
            air_temp = pd.to_numeric(df.get('ATMP', None), errors='coerce')
            df['temperature'] = df['temperature'].fillna(air_temp)

            df['wave_height'] = pd.to_numeric(df.get('WVHT', None), errors='coerce')
            df['wind_speed'] = pd.to_numeric(df.get('WSPD', None), errors='coerce')
            df['salinity'] = pd.to_numeric(df.get('SAL', None), errors='coerce')

            # Replace 999 and 99 (NOAA missing data markers) with None
            df = df.replace([999, 99, 999.0, 99.0], None)

            return df

        except Exception as e:
            logger.error(f"Failed to fetch NOAA data for station {station_id}: {e}")
            return pd.DataFrame()

    def process_and_store(self, df: pd.DataFrame, station_info: Dict) -> int:
        """Process and store data in database"""
        if df.empty:
            return 0

        records = []
        for _, row in df.iterrows():
            if pd.isna(row.get('recorded_at')):
                continue

            record = {
                "station_id": station_info["id"],
                "latitude": station_info["lat"],
                "longitude": station_info["lon"],
                "recorded_at": row['recorded_at'],
                "temperature": row.get('temperature'),
                "salinity": row.get('salinity'),
                "wave_height": row.get('wave_height'),
                "wind_speed": row.get('wind_speed'),
                "source": "NOAA_NDBC",
            }

            # Only add records with at least one valid measurement
            if any([record['temperature'], record['salinity'], record['wave_height'], record['wind_speed']]):
                records.append(record)

        if not records:
            return 0

        # Insert into database
        result_df = pd.DataFrame(records)
        result_df.to_sql(
            "ocean_data",
            self.engine,
            if_exists='append',
            index=False,
            method='multi'
        )

        logger.info(f"Inserted {len(records)} records from station {station_info['id']}")
        return len(records)

    def run(self) -> Dict:
        """Run the complete NOAA pipeline"""
        logger.info("Starting NOAA ingestion pipeline")
        total_records = 0

        for station in self.STATIONS:
            try:
                df = self.fetch_noaa_buoy(station["id"])
                if not df.empty:
                    count = self.process_and_store(df, station)
                    total_records += count
            except Exception as e:
                logger.error(f"Error processing station {station['id']}: {e}")
                continue

        logger.info(f"NOAA pipeline completed. Total records: {total_records}")

        # Log the ingestion
        with Session(self.engine) as session:
            from datetime import datetime
            session.execute(text("""
                INSERT INTO ingestion_logs (data_type, source, status, records_ingested, created_at)
                VALUES ('ocean', 'NOAA_NDBC', 'success', :count, :now)
            """), {"count": total_records, "now": datetime.now(timezone.utc)})
            session.commit()

        return {
            "status": "success",
            "data_type": "ocean",
            "records_ingested": total_records,
            "source": "NOAA_NDBC"
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    pipeline = NOAAPipeline("postgresql://user:pass@localhost:5432/marine_data")
    result = pipeline.run()
    print(result)
