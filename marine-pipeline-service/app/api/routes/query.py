from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import distinct, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Forecast, Taxonomy
from app.db.session import get_db_session
from app.schemas.common import CorrelationResponse, ForecastResponse, OceanQueryResponse, SpeciesResponse
from app.services.analytics_service import AnalyticsService
from app.services.linking_service import LinkingService

router = APIRouter(tags=["query"])
analytics_service = AnalyticsService()
linking_service = LinkingService()


@router.get("/ocean", response_model=list[OceanQueryResponse])
async def get_ocean_data(
    lat: float,
    lon: float,
    radius_km: float = 50.0,
    limit: int = 100,
    session: AsyncSession = Depends(get_db_session),
) -> list[OceanQueryResponse]:
    q = text(
        """
        SELECT location, latitude, longitude, recorded_at, temperature_c,
               salinity_psu, oxygen_mg_l, chlorophyll_mg_m3, ph,
               current_speed_ms, source
        FROM ocean_data
        WHERE ST_DWithin(
            geom::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
            :radius_meters
        )
        ORDER BY recorded_at DESC
        LIMIT :limit
        """
    )
    result = await session.execute(
        q,
        {
            "lat": lat,
            "lon": lon,
            "radius_meters": radius_km * 1000,
            "limit": limit,
        },
    )
    return [OceanQueryResponse(**row) for row in result.mappings().all()]


@router.get("/species", response_model=SpeciesResponse)
async def get_species(name: str, session: AsyncSession = Depends(get_db_session)) -> SpeciesResponse:
    entry = await session.scalar(select(Taxonomy).where(Taxonomy.scientific_name == name))
    if not entry:
        raise HTTPException(status_code=404, detail=f"Species not found: {name}")

    return SpeciesResponse(
        scientific_name=entry.scientific_name,
        canonical_name=entry.canonical_name,
        rank=entry.rank,
        gbif_species_key=entry.gbif_species_key,
    )


@router.get("/correlations", response_model=list[CorrelationResponse])
async def get_correlations(
    species: str | None = None,
    session: AsyncSession = Depends(get_db_session),
) -> list[CorrelationResponse]:
    columns_result = await session.execute(
        text(
            """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = current_schema()
              AND table_name = 'correlations'
            """
        )
    )
    columns = {str(row[0]) for row in columns_result.all()}

    if not columns:
        return []

    if "species_name" in columns and "species" in columns:
        species_expr = "COALESCE(species_name, species)"
    elif "species_name" in columns:
        species_expr = "species_name"
    elif "species" in columns:
        species_expr = "species"
    else:
        species_expr = "NULL"

    has_new_schema = {"metric_x", "metric_y", "value", "sample_size"}.issubset(columns)

    params: dict[str, str] = {}
    where_clause = ""
    if species:
        where_clause = f"WHERE {species_expr} = :species"
        params["species"] = species

    if has_new_schema:
        query_sql = text(
            f"""
            SELECT
                {species_expr} AS species_name,
                metric_x,
                metric_y,
                value,
                sample_size,
                COALESCE(computed_at, NOW()) AS computed_at
            FROM correlations
            {where_clause}
            ORDER BY COALESCE(computed_at, NOW()) DESC
            """
        )
    else:
        correlation_value_expr = "correlation_coefficient" if "correlation_coefficient" in columns else "0"
        if "recorded_at" in columns and "created_at" in columns:
            computed_expr = "COALESCE(recorded_at, created_at, NOW())"
        elif "recorded_at" in columns:
            computed_expr = "COALESCE(recorded_at, NOW())"
        elif "created_at" in columns:
            computed_expr = "COALESCE(created_at, NOW())"
        else:
            computed_expr = "NOW()"

        query_sql = text(
            f"""
            SELECT
                {species_expr} AS species_name,
                'environmental_correlation' AS metric_x,
                'abundance' AS metric_y,
                COALESCE({correlation_value_expr}, 0)::double precision AS value,
                1 AS sample_size,
                {computed_expr} AS computed_at
            FROM correlations
            {where_clause}
            ORDER BY {computed_expr} DESC
            """
        )

    result = await session.execute(query_sql, params)
    return [CorrelationResponse(**row) for row in result.mappings().all()]


@router.get("/forecast", response_model=ForecastResponse)
async def get_forecast(
    species: str,
    session: AsyncSession = Depends(get_db_session),
) -> ForecastResponse:
    latest_ocean = await session.execute(
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
    ocean_row = latest_ocean.mappings().first()
    if not ocean_row:
        raise HTTPException(status_code=404, detail="No ocean data available for forecast")

    forecast = await analytics_service.predict_fish_abundance(
        session=session,
        species_name=species,
        temperature_c=float(ocean_row["temperature_c"]),
        salinity_psu=float(ocean_row["salinity_psu"]),
        oxygen_mg_l=float(ocean_row["oxygen_mg_l"]),
    )
    if not forecast:
        raise HTTPException(
            status_code=404,
            detail=f"Insufficient training data for species '{species}'. Ingest more fisheries records first.",
        )

    return ForecastResponse(
        species_name=forecast.species_name,
        forecasted_abundance=forecast.forecasted_abundance,
        model_version=forecast.model_version,
        forecast_for=forecast.forecast_for,
        created_at=forecast.created_at,
    )


@router.get("/species-list", response_model=list[str])
async def get_species_list(session: AsyncSession = Depends(get_db_session)) -> list[str]:
    result = await session.execute(select(distinct(Taxonomy.scientific_name)))
    return [row[0] for row in result.all() if row[0]]


@router.post("/correlations/recompute", response_model=list[CorrelationResponse])
async def recompute_correlations(
    radius_km: float = 50.0,
    session: AsyncSession = Depends(get_db_session),
) -> list[CorrelationResponse]:
    rows = await linking_service.generate_correlations(session=session, radius_km=radius_km)
    return [
        CorrelationResponse(
            species_name=r.species_name,
            metric_x=r.metric_x,
            metric_y=r.metric_y,
            value=r.value,
            sample_size=r.sample_size,
            computed_at=r.computed_at,
        )
        for r in rows
    ]
