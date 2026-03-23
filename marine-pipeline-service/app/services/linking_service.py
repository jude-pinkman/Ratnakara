from __future__ import annotations

from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Correlation


class LinkingService:
    async def generate_correlations(
        self,
        session: AsyncSession,
        radius_km: float = 50.0,
    ) -> list[Correlation]:
        query = text(
            """
            SELECT
                f.species_name,
                f.abundance,
                o.temperature_c,
                o.salinity_psu,
                e.biodiversity_index
            FROM fisheries_data f
            JOIN ocean_data o
              ON ST_DWithin(
                  f.geom::geography,
                  o.geom::geography,
                  :radius_meters
              )
             AND o.recorded_at BETWEEN (f.recorded_at - INTERVAL '1 day') AND (f.recorded_at + INTERVAL '1 day')
            LEFT JOIN edna_data e
              ON ST_DWithin(
                  f.geom::geography,
                  e.geom::geography,
                  :radius_meters
              )
             AND e.recorded_at BETWEEN (f.recorded_at - INTERVAL '1 day') AND (f.recorded_at + INTERVAL '1 day')
            """
        )
        result = await session.execute(query, {"radius_meters": radius_km * 1000})
        rows = result.mappings().all()
        if not rows:
            return []

        df = pd.DataFrame(rows)
        persisted: list[Correlation] = []

        valid_temp = df.dropna(subset=["temperature_c", "abundance"])
        if len(valid_temp) >= 5:
            corr_value = float(valid_temp["temperature_c"].corr(valid_temp["abundance"]))
            persisted.append(
                Correlation(
                    species_name=None,
                    metric_x="temperature_c",
                    metric_y="fish_abundance",
                    value=corr_value,
                    sample_size=len(valid_temp),
                    computed_at=datetime.now(timezone.utc),
                    notes=f"radius_km={radius_km}, window=+-1 day",
                )
            )

        valid_biodiversity = df.dropna(subset=["salinity_psu", "biodiversity_index"])
        if len(valid_biodiversity) >= 5:
            corr_value = float(valid_biodiversity["salinity_psu"].corr(valid_biodiversity["biodiversity_index"]))
            persisted.append(
                Correlation(
                    species_name=None,
                    metric_x="salinity_psu",
                    metric_y="biodiversity_index",
                    value=corr_value,
                    sample_size=len(valid_biodiversity),
                    computed_at=datetime.now(timezone.utc),
                    notes=f"radius_km={radius_km}, window=+-1 day",
                )
            )

        species_groups = df.groupby("species_name", dropna=True)
        for species, group in species_groups:
            subset = group.dropna(subset=["temperature_c", "abundance"])
            if len(subset) >= 5:
                species_corr = float(subset["temperature_c"].corr(subset["abundance"]))
                persisted.append(
                    Correlation(
                        species_name=str(species),
                        metric_x="temperature_c",
                        metric_y="fish_abundance",
                        value=species_corr,
                        sample_size=len(subset),
                        computed_at=datetime.now(timezone.utc),
                        notes=f"radius_km={radius_km}, window=+-1 day",
                    )
                )

        session.add_all(persisted)
        await session.commit()
        return persisted
