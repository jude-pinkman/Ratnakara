from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        protected_namespaces=("settings_",),
    )

    app_name: str = "Marine Data Pipeline"
    app_env: str = Field(default="development")
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8090)
    log_level: str = Field(default="INFO")

    database_url: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/marine_data"
    )

    http_timeout_seconds: float = Field(default=30.0)
    http_max_retries: int = Field(default=3)
    request_backoff_base: float = Field(default=1.5)

    ocean_default_lat: float = Field(default=0.0)
    ocean_default_lon: float = Field(default=0.0)
    ocean_query_radius_km: float = Field(default=100.0)
    live_only_mode: bool = Field(default=True)

    noaa_base_url: str = Field(default="https://www.ncei.noaa.gov/access/services/data/v1")
    ndbc_realtime_base_url: str = Field(default="https://www.ndbc.noaa.gov/data/realtime2")
    ndbc_station_list: str = Field(default="41037:32.26:-76.76")
    noaa_coops_base_url: str = Field(default="https://api.tidesandcurrents.noaa.gov/api/prod/datagetter")
    noaa_coops_station_list: str = Field(default="8724580:30.671:-81.428")
    copernicus_base_url: str = Field(default="https://data.marine.copernicus.eu/api")
    obis_base_url: str = Field(default="https://api.obis.org/v3")
    gbif_base_url: str = Field(default="https://api.gbif.org/v1")
    nasa_oceancolor_base_url: str = Field(default="https://oceandata.sci.gsfc.nasa.gov/api")
    fao_base_url: str = Field(default="https://fenixservices.fao.org/faostat/api/v1")
    ais_stream_url: str | None = None
    edna_stream_url: str | None = None

    copernicus_api_key: str | None = None

    scheduler_enabled: bool = Field(default=True)
    scheduler_ocean_job_minutes: int = Field(default=60)

    model_dir: str = Field(default="models")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
