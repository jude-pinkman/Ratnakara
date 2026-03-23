from __future__ import annotations

from datetime import datetime, timedelta, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db.models import Forecast, OceanData


class AnalyticsService:
    def __init__(self) -> None:
        settings = get_settings()
        self.model_dir = Path(settings.model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)

    async def train_fish_abundance_model(self, session: AsyncSession, species_name: str) -> str | None:
        query = text(
            """
            SELECT
                f.species_name,
                f.abundance,
                o.temperature_c,
                o.salinity_psu,
                o.oxygen_mg_l,
                f.recorded_at
            FROM fisheries_data f
            JOIN ocean_data o
              ON ST_DWithin(f.geom::geography, o.geom::geography, 50000)
             AND o.recorded_at BETWEEN (f.recorded_at - INTERVAL '1 day') AND (f.recorded_at + INTERVAL '1 day')
            WHERE f.species_name = :species_name
              AND o.temperature_c IS NOT NULL
              AND o.salinity_psu IS NOT NULL
              AND o.oxygen_mg_l IS NOT NULL
            """
        )
        result = await session.execute(query, {"species_name": species_name})
        rows = result.mappings().all()
        if len(rows) < 30:
            return None

        df = pd.DataFrame(rows)
        x = df[["temperature_c", "salinity_psu", "oxygen_mg_l"]]
        y = df["abundance"]

        model = RandomForestRegressor(
            n_estimators=300,
            max_depth=12,
            min_samples_leaf=3,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(x, y)

        model_path = self.model_dir / f"rf_{species_name.replace(' ', '_')}.joblib"
        joblib.dump(model, model_path)
        return str(model_path)

    async def predict_fish_abundance(
        self,
        session: AsyncSession,
        species_name: str,
        temperature_c: float,
        salinity_psu: float,
        oxygen_mg_l: float,
    ) -> Forecast | None:
        model_path = self.model_dir / f"rf_{species_name.replace(' ', '_')}.joblib"
        if not model_path.exists():
            trained = await self.train_fish_abundance_model(session, species_name)
            if not trained:
                return None

        model: RandomForestRegressor = joblib.load(model_path)
        features = np.array([[temperature_c, salinity_psu, oxygen_mg_l]])
        prediction = float(model.predict(features)[0])

        forecast = Forecast(
            species_name=species_name,
            forecasted_abundance=prediction,
            model_version="rf_v1",
            forecast_for=datetime.now(timezone.utc) + timedelta(days=1),
            created_at=datetime.now(timezone.utc),
            features={
                "temperature_c": temperature_c,
                "salinity_psu": salinity_psu,
                "oxygen_mg_l": oxygen_mg_l,
            },
        )
        session.add(forecast)
        await session.commit()
        await session.refresh(forecast)
        return forecast

    async def detect_ocean_anomalies(self, session: AsyncSession, lookback_hours: int = 72) -> list[int]:
        min_time = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
        result = await session.execute(
            select(OceanData).where(OceanData.recorded_at >= min_time)
        )
        data = result.scalars().all()
        if len(data) < 20:
            return []

        rows = []
        ids = []
        for rec in data:
            if rec.temperature_c is None or rec.salinity_psu is None or rec.oxygen_mg_l is None:
                continue
            ids.append(rec.id)
            rows.append([rec.temperature_c, rec.salinity_psu, rec.oxygen_mg_l])

        if len(rows) < 20:
            return []

        arr = np.array(rows)
        model = IsolationForest(contamination=0.03, random_state=42)
        flags = model.fit_predict(arr)

        return [record_id for record_id, flag in zip(ids, flags, strict=False) if flag == -1]
