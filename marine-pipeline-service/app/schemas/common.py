from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class APIModel(BaseModel):
    model_config = ConfigDict(protected_namespaces=())


class CommonRecord(APIModel):
    location: str | None = None
    latitude: float
    longitude: float
    recorded_at: datetime
    data_type: str
    attributes: dict[str, Any] = Field(default_factory=dict)


class IngestionResponse(APIModel):
    status: str
    data_type: str
    records_ingested: int
    source: str
    message: str | None = None


class OceanQueryResponse(APIModel):
    location: str | None
    latitude: float
    longitude: float
    recorded_at: datetime
    temperature_c: float | None = None
    salinity_psu: float | None = None
    oxygen_mg_l: float | None = None
    chlorophyll_mg_m3: float | None = None
    ph: float | None = None
    current_speed_ms: float | None = None
    source: str


class SpeciesResponse(APIModel):
    scientific_name: str
    canonical_name: str | None = None
    rank: str | None = None
    gbif_species_key: int | None = None


class CorrelationResponse(APIModel):
    species_name: str | None = None
    metric_x: str
    metric_y: str
    value: float
    sample_size: int
    computed_at: datetime


class ForecastResponse(APIModel):
    species_name: str
    forecasted_abundance: float
    model_version: str
    forecast_for: datetime
    created_at: datetime
