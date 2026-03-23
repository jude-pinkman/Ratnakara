from __future__ import annotations

import logging
from datetime import datetime, timezone

import pandas as pd
from fastapi import HTTPException
from geoalchemy2 import WKTElement
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import EDNAData, FisheriesData, IngestionLog, OceanData, Taxonomy
from app.services.ingestion_clients import OpenDataClients
from app.services.transform import transform_to_common_schema

logger = logging.getLogger(__name__)


class IngestionService:
    def __init__(self, clients: OpenDataClients | None = None) -> None:
        self.clients = clients or OpenDataClients()

    async def ingest_ocean(
        self,
        session: AsyncSession,
        lat: float,
        lon: float,
    ) -> dict:
        try:
            _ = (lat, lon)
            raw_df = await self.clients.fetch_gbif_marine_occurrences()
            source = "GBIF_MARINE"

            transformed = transform_to_common_schema(raw_df, data_type="ocean")
            if transformed.empty:
                raise RuntimeError("Ocean ingestion produced no valid records after transformation")
            records = []
            for _, row in transformed.iterrows():
                point = WKTElement(f"POINT({row['longitude']} {row['latitude']})", srid=4326)
                records.append(
                    OceanData(
                        location=row.get("location"),
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        recorded_at=row["recorded_at"].to_pydatetime(),
                        source=row.get("source", source),
                        temperature_c=_num_or_none(row.get("temperature_c")),
                        salinity_psu=_num_or_none(row.get("salinity_psu")),
                        oxygen_mg_l=_num_or_none(row.get("oxygen_mg_l")),
                        chlorophyll_mg_m3=_num_or_none(row.get("chlorophyll_mg_m3")),
                        ph=_num_or_none(row.get("ph")),
                        current_speed_ms=_num_or_none(row.get("current_speed_ms")),
                        attributes=row.get("attributes", {}),
                        geom=point,
                    )
                )

            session.add_all(records)
            await self._create_log(session, "ocean", source, "success", len(records), None)
            await session.commit()
            return {
                "status": "success",
                "data_type": "ocean",
                "records_ingested": len(records),
                "source": source,
                "message": None,
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("Ocean ingestion failed")
            await session.rollback()
            await self._create_log(session, "ocean", "mixed", "failed", 0, str(exc))
            await session.commit()
            raise HTTPException(status_code=502, detail=f"Ocean ingestion failed: {exc}") from exc

    async def ingest_fisheries(
        self,
        session: AsyncSession,
    ) -> dict:
        try:
            raw_df = await self.clients.fetch_gbif_fisheries_occurrences()
            source = "GBIF_FISHERIES"

            transformed = transform_to_common_schema(raw_df, data_type="fisheries")
            if transformed.empty:
                raise RuntimeError("Live fisheries ingestion produced no valid records")
            records = []
            for _, row in transformed.iterrows():
                taxonomy_id = await self._resolve_taxonomy_id(session, str(row["species_name"]))
                point = WKTElement(f"POINT({row['longitude']} {row['latitude']})", srid=4326)
                records.append(
                    FisheriesData(
                        location=row.get("location"),
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        recorded_at=row["recorded_at"].to_pydatetime(),
                        source=row.get("source", source),
                        species_name=str(row["species_name"]),
                        abundance=float(row["abundance"]),
                        taxonomy_id=taxonomy_id,
                        attributes=row.get("attributes", {}),
                        geom=point,
                    )
                )

            session.add_all(records)
            await self._create_log(session, "fisheries", source, "success", len(records), None)
            await session.commit()
            return {
                "status": "success",
                "data_type": "fisheries",
                "records_ingested": len(records),
                "source": source,
                "message": None,
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("Fisheries ingestion failed")
            await session.rollback()
            await self._create_log(session, "fisheries", "mixed", "failed", 0, str(exc))
            await session.commit()
            raise HTTPException(status_code=502, detail=f"Fisheries ingestion failed: {exc}") from exc

    async def ingest_edna(
        self,
        session: AsyncSession,
        species_name: str | None = None,
    ) -> dict:
        try:
            raw_df = await self.clients.fetch_gbif_edna_occurrences(species_name=species_name)
            source = "GBIF_EDNA"

            transformed = transform_to_common_schema(raw_df, data_type="edna")
            if transformed.empty:
                raise RuntimeError("Live eDNA ingestion produced no valid records")
            records = []
            for _, row in transformed.iterrows():
                species = str(row.get("species_name")) if pd.notna(row.get("species_name")) else None
                if not species:
                    continue
                taxonomy_id = await self._resolve_taxonomy_id(session, species) if species else None
                location = row.get("location")
                if location is None or (isinstance(location, str) and not location.strip()):
                    location = f"edna-{float(row['latitude']):.4f}-{float(row['longitude']):.4f}"
                point = WKTElement(f"POINT({row['longitude']} {row['latitude']})", srid=4326)
                records.append(
                    EDNAData(
                        location=location,
                        latitude=float(row["latitude"]),
                        longitude=float(row["longitude"]),
                        recorded_at=row["recorded_at"].to_pydatetime(),
                        source=row.get("source", source),
                        species_name=species,
                        biodiversity_index=_num_or_none(row.get("biodiversity_index")),
                        read_count=_num_or_none(row.get("read_count")),
                        taxonomy_id=taxonomy_id,
                        attributes=row.get("attributes", {}),
                        geom=point,
                    )
                )

            session.add_all(records)
            await self._create_log(session, "edna", source, "success", len(records), None)
            await session.commit()
            return {
                "status": "success",
                "data_type": "edna",
                "records_ingested": len(records),
                "source": source,
                "message": None,
            }
        except Exception as exc:  # noqa: BLE001
            logger.exception("eDNA ingestion failed")
            await session.rollback()
            await self._create_log(session, "edna", "mixed", "failed", 0, str(exc))
            await session.commit()
            raise HTTPException(status_code=502, detail=f"eDNA ingestion failed: {exc}") from exc

    async def _resolve_taxonomy_id(self, session: AsyncSession, species_name: str | None) -> int | None:
        if not species_name:
            return None

        existing = await session.scalar(select(Taxonomy).where(Taxonomy.scientific_name == species_name))
        if existing:
            return existing.id

        # In mixed-schema deployments, taxonomy can enforce legacy NOT NULL columns
        # that are not represented in this service model. Skip creating new taxonomy
        # rows at ingest time and proceed with a null taxonomy_id.
        return None

    @staticmethod
    async def _create_log(
        session: AsyncSession,
        data_type: str,
        source: str,
        status: str,
        records_ingested: int,
        message: str | None,
    ) -> None:
        session.add(
            IngestionLog(
                data_type=data_type,
                source=source,
                status=status,
                records_ingested=records_ingested,
                message=message,
                created_at=datetime.now(timezone.utc),
            )
        )


def _num_or_none(value: object) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None
