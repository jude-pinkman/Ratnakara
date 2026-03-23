"""
GBIF Taxonomy Fetcher
Fetches real taxonomic data from GBIF API
"""
import requests
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import logging
import urllib3

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

logger = logging.getLogger(__name__)


class TaxonomyFetcher:
    """Fetches taxonomy data from GBIF API"""

    GBIF_API_BASE = "https://api.gbif.org/v1"

    MARINE_SPECIES = [
        "Thunnus albacares",  # Yellowfin tuna
        "Katsuwonus pelamis",  # Skipjack tuna
        "Sardinella longiceps",  # Indian oil sardine
        "Scomberomorus guttatus",  # Indo-Pacific king mackerel
        "Rastrelliger kanagurta",  # Indian mackerel
        "Scomber scombrus",  # Atlantic mackerel
        "Engraulis encrasicolus",  # European anchovy
        "Clupea harengus",  # Atlantic herring
        "Gadus morhua",  # Atlantic cod
        "Salmo salar",  # Atlantic salmon
    ]

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)

    def fetch_taxonomy(self, species_name: str) -> dict:
        """Fetch taxonomy data from GBIF for a single species"""
        try:
            url = f"{self.GBIF_API_BASE}/species/match"
            params = {"name": species_name, "verbose": True}

            response = requests.get(url, params=params, timeout=10, verify=False)
            response.raise_for_status()
            data = response.json()

            if data.get("matchType") == "NONE":
                logger.warning(f"No match found for species: {species_name}")
                return None

            taxonomy = {
                "species": species_name,
                "kingdom": data.get("kingdom"),
                "phylum": data.get("phylum"),
                "class_name": data.get("class"),
                "order_name": data.get("order"),
                "family": data.get("family"),
                "genus": data.get("genus"),
                "gbif_species_key": data.get("usageKey"),
            }

            logger.info(f"Fetched taxonomy for {species_name}")
            return taxonomy

        except Exception as e:
            logger.error(f"Failed to fetch taxonomy for {species_name}: {e}")
            return None

    def store_taxonomy(self, taxonomy_data: dict) -> bool:
        """Store taxonomy data in database"""
        if not taxonomy_data:
            return False

        try:
            with Session(self.engine) as session:
                # Check if species already exists
                existing = session.execute(
                    text("SELECT id FROM taxonomy WHERE species = :species"),
                    {"species": taxonomy_data["species"]}
                ).fetchone()

                if existing:
                    logger.info(f"Taxonomy for {taxonomy_data['species']} already exists")
                    return False

                # Insert new taxonomy
                session.execute(text("""
                    INSERT INTO taxonomy (species, kingdom, phylum, class_name, order_name, family, genus, gbif_species_key)
                    VALUES (:species, :kingdom, :phylum, :class_name, :order_name, :family, :genus, :gbif_species_key)
                """), taxonomy_data)
                session.commit()

                logger.info(f"Stored taxonomy for {taxonomy_data['species']}")
                return True

        except Exception as e:
            logger.error(f"Failed to store taxonomy: {e}")
            return False

    def run(self) -> dict:
        """Run the complete taxonomy fetching pipeline"""
        logger.info("Starting taxonomy fetching pipeline")

        success_count = 0
        failed_count = 0

        for species in self.MARINE_SPECIES:
            try:
                taxonomy_data = self.fetch_taxonomy(species)
                if taxonomy_data:
                    stored = self.store_taxonomy(taxonomy_data)
                    if stored:
                        success_count += 1
                else:
                    failed_count += 1
            except Exception as e:
                logger.error(f"Error processing species {species}: {e}")
                failed_count += 1

        # Log the ingestion
        with Session(self.engine) as session:
            session.execute(text("""
                INSERT INTO ingestion_logs (data_type, source, status, records_ingested, created_at)
                VALUES ('taxonomy', 'GBIF', 'success', :count, :now)
            """), {"count": success_count, "now": datetime.now(timezone.utc)})
            session.commit()

        logger.info(f"Taxonomy fetching completed. Success: {success_count}, Failed: {failed_count}")

        return {
            "status": "success",
            "data_type": "taxonomy",
            "records_ingested": success_count,
            "source": "GBIF",
            "failed": failed_count
        }


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    fetcher = TaxonomyFetcher("postgresql://user:pass@localhost:5432/marine_data")
    result = fetcher.run()
    print(result)
