#!/usr/bin/env python3
"""
Schema Validator - Ensures API data matches database schema
Validates field mapping between data sources and database
"""

import os
from datetime import datetime
from sqlalchemy import create_engine, inspect, text
from typing import Dict, List, Tuple
import logging
from dotenv import load_dotenv

load_dotenv("marine-pipeline-service/.env")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SchemaValidator:
    """Validates database schema against expected field mappings"""

    # Expected field mappings for each data source
    NOAA_FIELDS = {
        "station_id": ("VARCHAR", "API field: station_id or default"),
        "latitude": ("DOUBLE PRECISION", "API field: latitude or station lat"),
        "longitude": ("DOUBLE PRECISION", "API field: longitude or station lon"),
        "recorded_at": ("TIMESTAMP", "API field: recorded_at (converted from YY-MM-DD hh:mm)"),
        "temperature": ("DOUBLE PRECISION", "API field: WTMP (Water Temperature)"),
        "salinity": ("DOUBLE PRECISION", "API field: SAL (Salinity)"),
        "ph": ("DOUBLE PRECISION", "Optional: API field: pH"),
        "oxygen": ("DOUBLE PRECISION", "Optional: API field: Oxygen"),
        "wave_height": ("DOUBLE PRECISION", "API field: WVHT (Wave Height)"),
        "wind_speed": ("DOUBLE PRECISION", "API field: WSPD (Wind Speed)"),
        "source": ("VARCHAR", "API source name: NOAA_NDBC"),
    }

    FISHERIES_FIELDS = {
        "species": ("VARCHAR", "Mock/API field: species name"),
        "latitude": ("DOUBLE PRECISION", "Generated from ocean data"),
        "longitude": ("DOUBLE PRECISION", "Generated from ocean data"),
        "recorded_at": ("TIMESTAMP", "Generated timestamp"),
        "abundance": ("INTEGER", "Generated abundance count"),
        "biomass": ("DOUBLE PRECISION", "Generated biomass value"),
        "diversity_index": ("DOUBLE PRECISION", "Generated diversity metric"),
        "region": ("VARCHAR", "Mock field: region name"),
        "source": ("VARCHAR", "Data source: MOCK or API"),
        "taxonomy_id": ("INTEGER", "Foreign key to taxonomy table"),
    }

    EDNA_FIELDS = {
        "species": ("VARCHAR", "API field: species name"),
        "latitude": ("DOUBLE PRECISION", "API field: latitude"),
        "longitude": ("DOUBLE PRECISION", "API field: longitude"),
        "recorded_at": ("TIMESTAMP", "API field: recorded_at"),
        "concentration": ("DOUBLE PRECISION", "API field: eDNA concentration"),
        "confidence": ("DOUBLE PRECISION", "API field: confidence score"),
        "depth": ("INTEGER", "API field: sampling depth"),
        "source": ("VARCHAR", "API source name"),
        "taxonomy_id": ("INTEGER", "Foreign key to taxonomy table"),
    }

    TAXONOMY_FIELDS = {
        "species": ("VARCHAR UNIQUE", "API field: scientific name"),
        "kingdom": ("VARCHAR", "API field: taxonomic kingdom"),
        "phylum": ("VARCHAR", "API field: taxonomic phylum"),
        "class_name": ("VARCHAR", "API field: css_name or class"),
        "order_name": ("VARCHAR", "API field: order_name"),
        "family": ("VARCHAR", "API field: family"),
        "genus": ("VARCHAR", "API field: genus"),
        "gbif_species_key": ("INTEGER", "API field: GBIF species key"),
    }

    def __init__(self, database_url: str):
        self.engine = create_engine(database_url)
        self.inspector = inspect(self.engine)
        self.issues: List[Dict] = []
        self.warnings: List[Dict] = []

    def validate_all(self) -> bool:
        """Run all validations"""
        logger.info("Starting schema validation...")

        tables_found = self.inspector.get_table_names()
        logger.info(f"Found tables: {tables_found}")

        # Check if all required tables exist
        required_tables = ["ocean_data", "fisheries_data", "edna_data", "taxonomy", "correlations", "forecasts"]
        missing_tables = [t for t in required_tables if t not in tables_found]

        if missing_tables:
            logger.error(f"Missing tables: {missing_tables}")
            self.issues.append({
                "severity": "ERROR",
                "table": "N/A",
                "message": f"Missing required tables: {missing_tables}"
            })
            return False

        # Validate each table
        self._validate_table("ocean_data", self.NOAA_FIELDS)
        self._validate_table("fisheries_data", self.FISHERIES_FIELDS)
        self._validate_table("edna_data", self.EDNA_FIELDS)
        self._validate_table("taxonomy", self.TAXONOMY_FIELDS)

        # Test connection and basic query
        self._test_connection()

        return self._report_results()

    def _validate_table(self, table_name: str, expected_fields: Dict[str, Tuple]):
        """Validate a single table's schema"""
        logger.info(f"Validating table: {table_name}")

        try:
            columns = self.inspector.get_columns(table_name)
            actual_columns = {col['name']: col['type'] for col in columns}

            # Check for missing fields
            for field_name, (field_type, description) in expected_fields.items():
                if field_name not in actual_columns:
                    self.issues.append({
                        "severity": "ERROR",
                        "table": table_name,
                        "field": field_name,
                        "message": f"Missing field '{field_name}' ({field_type}). Description: {description}"
                    })
                else:
                    # Check field type compatibility
                    actual_type = str(actual_columns[field_name])
                    if not self._is_compatible_type(actual_type, field_type):
                        self.warnings.append({
                            "severity": "WARNING",
                            "table": table_name,
                            "field": field_name,
                            "message": f"Type mismatch. Expected: {field_type}, Got: {actual_type}"
                        })

            # Check for unexpected fields
            for col_name in actual_columns:
                if col_name not in expected_fields and col_name not in ["id", "created_at", "geom"]:
                    # geom is PostGIS geometry, id and created_at are standard
                    pass

        except Exception as e:
            self.issues.append({
                "severity": "ERROR",
                "table": table_name,
                "message": f"Failed to validate table: {str(e)}"
            })

    def _is_compatible_type(self, actual: str, expected: str) -> bool:
        """Check if types are compatible"""
        actual_lower = actual.lower()
        expected_lower = expected.lower()

        type_map = {
            "integer": ["int", "serial"],
            "double precision": ["float", "double", "numeric"],
            "varchar": ["string", "text"],
            "timestamp": ["datetime", "timestamp"],
            "boolean": ["bool"],
        }

        for canonical_type, aliases in type_map.items():
            if canonical_type in expected_lower:
                for alias in aliases:
                    if alias in actual_lower:
                        return True
                if canonical_type in actual_lower:
                    return True

        return expected_lower in actual_lower or actual_lower in expected_lower

    def _test_connection(self):
        """Test database connection"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT NOW()"))
                timestamp = result.scalar()
                logger.info(f"✓ Database connection successful. Server time: {timestamp}")
        except Exception as e:
            self.issues.append({
                "severity": "ERROR",
                "table": "N/A",
                "message": f"Database connection failed: {str(e)}"
            })

    def _report_results(self) -> bool:
        """Generate and display validation report"""
        print("\n" + "="*80)
        print("SCHEMA VALIDATION REPORT")
        print("="*80)

        if self.issues:
            print("\n❌ ERRORS (must fix):")
            for issue in self.issues:
                print(f"  [{issue['table']}] {issue.get('field', 'N/A')}: {issue['message']}")

        if self.warnings:
            print("\n⚠️  WARNINGS (review):")
            for warning in self.warnings:
                print(f"  [{warning['table']}] {warning.get('field', 'N/A')}: {warning['message']}")

        if not self.issues and not self.warnings:
            print("\n✅ All validations passed!")
            print("Fields are properly mapped between APIs and database.")

        print("\n" + "="*80)
        return len(self.issues) == 0

    def generate_field_mapping_report(self):
        """Generate a detailed field mapping report for documentation"""
        report = "\n# Field Mapping Report\n\n"

        report += "## NOAA Ocean Data\n"
        report += self._format_field_table(self.NOAA_FIELDS)

        report += "\n## Fisheries Data\n"
        report += self._format_field_table(self.FISHERIES_FIELDS)

        report += "\n## eDNA Data\n"
        report += self._format_field_table(self.EDNA_FIELDS)

        report += "\n## Taxonomy Data\n"
        report += self._format_field_table(self.TAXONOMY_FIELDS)

        with open("FIELD_MAPPING.md", "w") as f:
            f.write(report)

        logger.info("Field mapping report saved to FIELD_MAPPING.md")

    def _format_field_table(self, fields: Dict) -> str:
        """Format field definitions as markdown table"""
        table = "| Field | Type | Source |\n"
        table += "|-------|------|--------|\n"
        for field, (type_, source) in fields.items():
            table += f"| {field} | {type_} | {source} |\n"
        return table


def main():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL not set in .env")
        exit(1)

    validator = SchemaValidator(db_url)
    success = validator.validate_all()
    validator.generate_field_mapping_report()

    exit(0 if success else 1)


if __name__ == "__main__":
    main()
