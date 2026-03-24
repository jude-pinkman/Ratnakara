#!/usr/bin/env python3
from __future__ import annotations

import argparse
import logging
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

LOGGER = logging.getLogger("otolith_etl")


def normalize_species_id(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9\s_-]", "", (name or "").strip().lower())
    cleaned = re.sub(r"[\s-]+", "_", cleaned)
    cleaned = re.sub(r"_+", "_", cleaned)
    return cleaned.strip("_")


def species_id_to_scientific(species_id: str) -> str:
    return " ".join([part.capitalize() for part in species_id.split("_") if part])


def first_non_empty(row: pd.Series, candidates: list[str]) -> str | None:
    for col in candidates:
        if col in row and pd.notna(row[col]):
            value = str(row[col]).strip()
            if value:
                return value
    return None


def read_csv_checked(csv_path: Path) -> pd.DataFrame:
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")
    df = pd.read_csv(csv_path)
    if df.empty:
        raise ValueError(f"CSV has no rows: {csv_path}")
    return df


def merge_taxonomy(
    taxonomy_data_path: Path,
    taxonomy_worms_path: Path,
    taxonomy_enriched_path: Path,
) -> pd.DataFrame:
    taxonomy_data = read_csv_checked(taxonomy_data_path)
    taxonomy_worms = read_csv_checked(taxonomy_worms_path)
    taxonomy_enriched = read_csv_checked(taxonomy_enriched_path)

    merged: dict[str, dict[str, str | None]] = {}

    def ingest(df: pd.DataFrame, source_name: str) -> None:
        for _, row in df.iterrows():
            raw_name = first_non_empty(
                row,
                ["ScientificName", "scientificName", "scientific_name", "species"],
            )
            if not raw_name:
                continue

            species_id = normalize_species_id(raw_name)
            if not species_id:
                continue

            record = merged.setdefault(
                species_id,
                {
                    "species": species_id,
                    "kingdom": None,
                    "phylum": None,
                    "class": None,
                    "order_name": None,
                    "family": None,
                    "genus": None,
                    "common_name": None,
                    "description": None,
                },
            )

            record["kingdom"] = record["kingdom"] or first_non_empty(row, ["kingdom"])
            record["phylum"] = record["phylum"] or first_non_empty(row, ["phylum"])
            record["class"] = record["class"] or first_non_empty(row, ["class", "class_name"])
            record["order_name"] = record["order_name"] or first_non_empty(row, ["order", "order_name"])
            record["family"] = record["family"] or first_non_empty(row, ["family"])
            record["genus"] = record["genus"] or first_non_empty(row, ["genus"])
            record["common_name"] = record["common_name"] or first_non_empty(row, ["vernacularName", "common_name"])

            status = first_non_empty(row, ["status", "occurrenceStatus"])
            source_description = f"taxonomy source={source_name}" + (f", status={status}" if status else "")
            record["description"] = record["description"] or source_description

    ingest(taxonomy_data, "taxonomy-data")
    ingest(taxonomy_worms, "taxonomy-Worms")
    ingest(taxonomy_enriched, "taxonomy-enriched")

    df = pd.DataFrame(sorted(merged.values(), key=lambda x: x["species"]))
    return df


def normalize_otolith_images(source_dir: Path, target_dir: Path) -> list[dict[str, str]]:
    target_dir.mkdir(parents=True, exist_ok=True)
    image_records: list[dict[str, str]] = []

    for image_path in sorted(source_dir.glob("*")):
        if image_path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue

        base_name = image_path.stem
        name_without_prefix = re.sub(r"^\d+_", "", base_name)
        species_id = normalize_species_id(name_without_prefix)
        if not species_id:
            LOGGER.warning("Skipping image with invalid species name: %s", image_path)
            continue

        new_name = f"{species_id}{image_path.suffix.lower()}"
        renamed_source_path = image_path.with_name(new_name)

        if image_path.name != new_name:
            if renamed_source_path.exists():
                LOGGER.info("Normalized filename already exists: %s", renamed_source_path.name)
            else:
                image_path.rename(renamed_source_path)
        else:
            renamed_source_path = image_path

        destination = target_dir / new_name
        shutil.copy2(renamed_source_path, destination)

        image_records.append(
            {
                "species": species_id,
                "image_path": f"/otolith_images/{new_name}",
            }
        )

    return image_records


def parse_otolith_records(otolith_processed_path: Path) -> pd.DataFrame:
    df = read_csv_checked(otolith_processed_path)

    species_col = "ScientificName" if "ScientificName" in df.columns else "scientificName"
    if species_col not in df.columns:
        raise ValueError("otolithname-processed.csv must include ScientificName or scientificName")

    records = pd.DataFrame()
    records["species"] = df[species_col].fillna("").map(normalize_species_id)
    records = records[records["species"] != ""].copy()

    if "eventDate" in df.columns:
        parsed = pd.to_datetime(df["eventDate"], errors="coerce", dayfirst=True)
        records["recorded_at"] = parsed.fillna(pd.Timestamp.now(tz=timezone.utc))
    else:
        records["recorded_at"] = pd.Timestamp.now(tz=timezone.utc)

    if "locality" in df.columns:
        records["location"] = df["locality"].astype(str).replace({"nan": None})
    else:
        records["location"] = None

    if "age_years" in df.columns:
        records["age_years"] = pd.to_numeric(df["age_years"], errors="coerce").astype("Int64")
    else:
        records["age_years"] = pd.Series([None] * len(records), dtype="Int64")

    return records[["species", "age_years", "recorded_at", "location"]]


def ensure_schema(cursor, schema_sql_path: Path) -> None:
    sql_text = schema_sql_path.read_text(encoding="utf-8")
    cursor.execute(sql_text)


def upsert_taxonomy(cursor, taxonomy_df: pd.DataFrame) -> None:
    rows = [tuple(x) for x in taxonomy_df[["species", "kingdom", "phylum", "class", "order_name", "family", "genus", "common_name", "description"]].itertuples(index=False, name=None)]
    execute_values(
        cursor,
        """
        INSERT INTO taxonomy (species, kingdom, phylum, class, order_name, family, genus, common_name, description)
        VALUES %s
        ON CONFLICT (species) DO UPDATE SET
            kingdom = COALESCE(EXCLUDED.kingdom, taxonomy.kingdom),
            phylum = COALESCE(EXCLUDED.phylum, taxonomy.phylum),
            class = COALESCE(EXCLUDED.class, taxonomy.class),
            order_name = COALESCE(EXCLUDED.order_name, taxonomy.order_name),
            family = COALESCE(EXCLUDED.family, taxonomy.family),
            genus = COALESCE(EXCLUDED.genus, taxonomy.genus),
            common_name = COALESCE(EXCLUDED.common_name, taxonomy.common_name),
            description = COALESCE(EXCLUDED.description, taxonomy.description)
        """,
        rows,
    )


def ensure_species_exists(cursor, species_ids: list[str]) -> None:
    unique_species = sorted(set([x for x in species_ids if x]))
    if not unique_species:
        return

    rows = [
        (
            species_id,
            f"Auto-inserted by otolith ETL at {datetime.now(timezone.utc).isoformat()}",
        )
        for species_id in unique_species
    ]

    execute_values(
        cursor,
        """
        INSERT INTO taxonomy (species, description)
        VALUES %s
        ON CONFLICT (species) DO NOTHING
        """,
        rows,
    )


def insert_otolith_records(cursor, records_df: pd.DataFrame) -> int:
    rows = []
    for species, age_years, recorded_at, location in records_df[["species", "age_years", "recorded_at", "location"]].itertuples(index=False, name=None):
        rows.append(
            (
                species,
                None if pd.isna(age_years) else int(age_years),
                recorded_at,
                None if pd.isna(location) else str(location),
            )
        )
    execute_values(
        cursor,
        """
        INSERT INTO otolith_records (species, age_years, recorded_at, location)
        VALUES %s
        """,
        rows,
    )
    return len(rows)


def insert_otolith_images(cursor, image_records: list[dict[str, str]]) -> int:
    if not image_records:
        return 0
    rows = [(r["species"], r["image_path"]) for r in image_records]
    execute_values(
        cursor,
        """
        INSERT INTO otolith_images (species, image_path)
        VALUES %s
        ON CONFLICT (image_path) DO UPDATE SET
            species = EXCLUDED.species,
            uploaded_at = NOW()
        """,
        rows,
    )
    return len(rows)


def recompute_otolith_correlations(cursor) -> None:
    cursor.execute("SELECT to_regclass('public.ocean_data')")
    has_ocean_data = cursor.fetchone()[0] is not None
    if not has_ocean_data:
        LOGGER.info("Skipping otolith/ocean correlation generation because ocean_data table is missing")
        return

    cursor.execute(
        """
        DELETE FROM correlations
        WHERE metric_x IN ('temperature_c', 'oxygen_mg_l')
          AND metric_y IN ('fish_age', 'species_distribution')
        """
    )

    cursor.execute(
        """
        WITH joined AS (
            SELECT
                r.species,
                r.age_years::double precision AS age_years,
                o.temperature_c,
                o.oxygen_mg_l
            FROM otolith_records r
            JOIN ocean_data o
              ON DATE_TRUNC('day', r.recorded_at) = DATE_TRUNC('day', o.recorded_at)
            WHERE r.age_years IS NOT NULL
        )
        INSERT INTO correlations (species_name, metric_x, metric_y, value, sample_size, computed_at)
        SELECT
            species,
            'temperature_c',
            'fish_age',
            corr(age_years, temperature_c),
            COUNT(*),
            NOW()
        FROM joined
        WHERE temperature_c IS NOT NULL
        GROUP BY species
        HAVING COUNT(*) >= 3
        """
    )

    cursor.execute(
        """
        WITH joined AS (
            SELECT
                r.species,
                o.oxygen_mg_l
            FROM otolith_records r
            JOIN ocean_data o
              ON DATE_TRUNC('day', r.recorded_at) = DATE_TRUNC('day', o.recorded_at)
            WHERE o.oxygen_mg_l IS NOT NULL
        )
        INSERT INTO correlations (species_name, metric_x, metric_y, value, sample_size, computed_at)
        SELECT
            species,
            'oxygen_mg_l',
            'species_distribution',
            AVG(oxygen_mg_l),
            COUNT(*),
            NOW()
        FROM joined
        GROUP BY species
        HAVING COUNT(*) >= 1
        """
    )


def run_etl(args: argparse.Namespace) -> None:
    taxonomy_df = merge_taxonomy(
        taxonomy_data_path=args.taxonomy_data,
        taxonomy_worms_path=args.taxonomy_worms,
        taxonomy_enriched_path=args.taxonomy_enriched,
    )

    records_df = parse_otolith_records(args.otolith_processed)
    image_records = normalize_otolith_images(args.otolith_dataset, args.otolith_target)

    output_taxonomy_path = args.output_taxonomy
    output_taxonomy_path.parent.mkdir(parents=True, exist_ok=True)
    taxonomy_df.to_csv(output_taxonomy_path, index=False)

    all_species = sorted(set(taxonomy_df["species"].tolist()) | set(records_df["species"].tolist()) | set([r["species"] for r in image_records]))

    conn = psycopg2.connect(args.database_url)
    conn.autocommit = False

    try:
        with conn.cursor() as cursor:
            ensure_schema(cursor, args.schema_sql)
            ensure_species_exists(cursor, all_species)
            upsert_taxonomy(cursor, taxonomy_df)
            inserted_records = insert_otolith_records(cursor, records_df)
            inserted_images = insert_otolith_images(cursor, image_records)
            recompute_otolith_correlations(cursor)

        conn.commit()
        LOGGER.info("ETL completed. taxonomy=%s, otolith_records=%s, otolith_images=%s", len(taxonomy_df), inserted_records, inserted_images)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def parse_args() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[1]
    default_dataset_root = root / "Taxonomyformatter"

    parser = argparse.ArgumentParser(description="OTOLITH + TAXONOMY ETL for Ratnakara")
    parser.add_argument("--taxonomy-data", type=Path, default=default_dataset_root / "taxonomy-data.csv")
    parser.add_argument("--taxonomy-worms", type=Path, default=default_dataset_root / "taxonomy-Worms.csv")
    parser.add_argument("--taxonomy-enriched", type=Path, default=default_dataset_root / "taxonomy-enriched.csv")
    parser.add_argument("--otolith-processed", type=Path, default=default_dataset_root / "otolithname-processed.csv")
    parser.add_argument("--otolith-dataset", type=Path, default=default_dataset_root / "otolith_dataset")
    parser.add_argument("--otolith-target", type=Path, default=root / "frontend" / "public" / "otolith_images")
    parser.add_argument("--output-taxonomy", type=Path, default=root / "data" / "taxonomy" / "taxonomy-final-enriched.csv")
    parser.add_argument("--schema-sql", type=Path, default=root / "scripts" / "sql" / "otolith_schema.sql")
    parser.add_argument("--database-url", default=os.environ.get("DATABASE_URL", ""))
    parser.add_argument("--log-file", type=Path, default=root / "data" / "ingestion" / "otolith_ingestion_errors.log")

    args = parser.parse_args()
    if not args.database_url:
        raise ValueError("DATABASE_URL env var or --database-url must be provided")
    return args


def configure_logging(log_file: Path) -> None:
    log_file.parent.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_file, encoding="utf-8"),
        ],
    )


if __name__ == "__main__":
    cli_args = parse_args()
    configure_logging(cli_args.log_file)
    run_etl(cli_args)
