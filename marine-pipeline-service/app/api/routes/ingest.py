from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.schemas.common import IngestionResponse
from app.services.ingestion_service import IngestionService

router = APIRouter(prefix="/ingest", tags=["ingestion"])
ingestion_service = IngestionService()


@router.post("/ocean", response_model=IngestionResponse)
async def ingest_ocean(
    lat: float = 0.0,
    lon: float = 0.0,
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResponse:
    result = await ingestion_service.ingest_ocean(session=session, lat=lat, lon=lon)
    return IngestionResponse(**result)


@router.post("/fisheries", response_model=IngestionResponse)
async def ingest_fisheries(
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResponse:
    result = await ingestion_service.ingest_fisheries(session=session)
    return IngestionResponse(**result)


@router.post("/edna", response_model=IngestionResponse)
async def ingest_edna(
    species_name: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> IngestionResponse:
    result = await ingestion_service.ingest_edna(session=session, species_name=species_name)
    return IngestionResponse(**result)
