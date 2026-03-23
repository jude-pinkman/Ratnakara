from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.routes.health import router as health_router
from app.api.routes.ingest import router as ingest_router
from app.api.routes.query import router as query_router
from app.core.config import get_settings
from app.core.http import ExternalAPIError
from app.core.logging import configure_logging
from app.db.base import Base
from app.db import models as _models  # noqa: F401
from app.db.session import engine
from app.services.scheduler import PipelineScheduler

settings = get_settings()
configure_logging(settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, version="1.0.0")
app.include_router(health_router)
app.include_router(ingest_router)
app.include_router(query_router)

scheduler = PipelineScheduler()


async def _ensure_schema_compatibility(conn) -> None:
    statements = [
        "ALTER TABLE IF EXISTS taxonomy ADD COLUMN IF NOT EXISTS scientific_name VARCHAR(255)",
        "ALTER TABLE IF EXISTS taxonomy ADD COLUMN IF NOT EXISTS canonical_name VARCHAR(255)",
        "ALTER TABLE IF EXISTS taxonomy ADD COLUMN IF NOT EXISTS rank VARCHAR(50)",
        "ALTER TABLE IF EXISTS taxonomy ADD COLUMN IF NOT EXISTS gbif_species_key INTEGER",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_taxonomy_scientific_name ON taxonomy (scientific_name)",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS source VARCHAR(100)",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS temperature_c DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS salinity_psu DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS oxygen_mg_l DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS chlorophyll_mg_m3 DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS ph DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS current_speed_ms DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb",
        "ALTER TABLE IF EXISTS ocean_data ADD COLUMN IF NOT EXISTS geom geometry(POINT,4326)",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS source VARCHAR(100)",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS species_name VARCHAR(255)",
        "ALTER TABLE IF EXISTS fisheries_data ALTER COLUMN species DROP NOT NULL",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS abundance DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS taxonomy_id INTEGER",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb",
        "ALTER TABLE IF EXISTS fisheries_data ADD COLUMN IF NOT EXISTS geom geometry(POINT,4326)",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS location VARCHAR(255)",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS source VARCHAR(100)",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS species_name VARCHAR(255)",
        "ALTER TABLE IF EXISTS edna_data ALTER COLUMN species DROP NOT NULL",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS biodiversity_index DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS read_count DOUBLE PRECISION",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS taxonomy_id INTEGER",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '{}'::jsonb",
        "ALTER TABLE IF EXISTS edna_data ADD COLUMN IF NOT EXISTS geom geometry(POINT,4326)",
        "CREATE INDEX IF NOT EXISTS idx_ocean_data_geom ON ocean_data USING GIST (geom)",
        "CREATE INDEX IF NOT EXISTS idx_fisheries_data_geom ON fisheries_data USING GIST (geom)",
        "CREATE INDEX IF NOT EXISTS idx_edna_data_geom ON edna_data USING GIST (geom)",
    ]
    for stmt in statements:
        await conn.execute(text(stmt))


@app.on_event("startup")
async def startup_event() -> None:
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
        await conn.run_sync(Base.metadata.create_all)
        await _ensure_schema_compatibility(conn)
    scheduler.start()
    logger.info("Marine pipeline API started")


@app.on_event("shutdown")
async def shutdown_event() -> None:
    scheduler.shutdown()
    await engine.dispose()
    logger.info("Marine pipeline API stopped")


@app.exception_handler(ExternalAPIError)
async def external_api_exception_handler(_: Request, exc: ExternalAPIError) -> JSONResponse:
    return JSONResponse(status_code=502, content={"detail": f"External API failure: {exc}"})


@app.exception_handler(Exception)
async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception")
    return JSONResponse(status_code=500, content={"detail": f"Internal error: {exc}"})
