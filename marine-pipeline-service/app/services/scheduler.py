from __future__ import annotations

import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.services.analytics_service import AnalyticsService
from app.services.ingestion_service import IngestionService
from app.services.linking_service import LinkingService

logger = logging.getLogger(__name__)


class PipelineScheduler:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.scheduler = AsyncIOScheduler(timezone="UTC")
        self.ingestion_service = IngestionService()
        self.analytics_service = AnalyticsService()
        self.linking_service = LinkingService()

    async def scheduled_ocean_pipeline(self) -> None:
        async with SessionLocal() as session:
            try:
                await self.ingestion_service.ingest_ocean(
                    session=session,
                    lat=self.settings.ocean_default_lat,
                    lon=self.settings.ocean_default_lon,
                )
                await self.ingestion_service.ingest_fisheries(session=session)
                await self.ingestion_service.ingest_edna(session=session)
                await self.linking_service.generate_correlations(session=session)

                result = await session.execute(text("SELECT DISTINCT species_name FROM fisheries_data"))
                species_names = [row[0] for row in result.all() if row[0]]
                for species in species_names:
                    latest = await session.execute(
                        text(
                            """
                            SELECT temperature_c, salinity_psu, oxygen_mg_l
                            FROM ocean_data
                            WHERE temperature_c IS NOT NULL AND salinity_psu IS NOT NULL AND oxygen_mg_l IS NOT NULL
                            ORDER BY recorded_at DESC
                            LIMIT 1
                            """
                        )
                    )
                    row = latest.mappings().first()
                    if not row:
                        continue
                    await self.analytics_service.predict_fish_abundance(
                        session=session,
                        species_name=species,
                        temperature_c=float(row["temperature_c"]),
                        salinity_psu=float(row["salinity_psu"]),
                        oxygen_mg_l=float(row["oxygen_mg_l"]),
                    )

                anomaly_ids = await self.analytics_service.detect_ocean_anomalies(session=session)
                if anomaly_ids:
                    logger.warning("Detected ocean anomalies for IDs: %s", anomaly_ids)
            except Exception:  # noqa: BLE001
                logger.exception("Scheduled marine pipeline run failed")

    def start(self) -> None:
        if not self.settings.scheduler_enabled:
            logger.info("Scheduler disabled by configuration")
            return

        self.scheduler.add_job(
            self.scheduled_ocean_pipeline,
            trigger="interval",
            minutes=self.settings.scheduler_ocean_job_minutes,
            id="ocean-hourly-pipeline",
            replace_existing=True,
            max_instances=1,
            coalesce=True,
        )
        self.scheduler.start()
        logger.info("Scheduler started: every %s minutes", self.settings.scheduler_ocean_job_minutes)

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("Scheduler stopped")
