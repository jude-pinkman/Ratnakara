from __future__ import annotations

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import JSON, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Taxonomy(Base):
    __tablename__ = "taxonomy"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    kingdom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    phylum: Mapped[str | None] = mapped_column(String(100), nullable=True)
    class_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    order_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    family: Mapped[str | None] = mapped_column(String(100), nullable=True)
    genus: Mapped[str | None] = mapped_column(String(100), nullable=True)
    gbif_species_key: Mapped[int | None] = mapped_column(Integer, nullable=True)


class OceanData(Base):
    __tablename__ = "ocean_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    station_id: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    temperature: Mapped[float | None] = mapped_column(Float, nullable=True)
    salinity: Mapped[float | None] = mapped_column(Float, nullable=True)
    ph: Mapped[float | None] = mapped_column(Float, nullable=True)
    oxygen: Mapped[float | None] = mapped_column(Float, nullable=True)
    wave_height: Mapped[float | None] = mapped_column(Float, nullable=True)
    wind_speed: Mapped[float | None] = mapped_column(Float, nullable=True)

    source: Mapped[str] = mapped_column(String(100), index=True, default="NOAA")
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))

    __table_args__ = (
        Index("idx_ocean_data_geom", "geom", postgresql_using="gist"),
        Index("idx_ocean_data_recorded_at", "recorded_at"),
    )


class FisheriesData(Base):
    __tablename__ = "fisheries_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species: Mapped[str] = mapped_column(String(255), index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    abundance: Mapped[int] = mapped_column(Integer)
    biomass: Mapped[float] = mapped_column(Float)
    diversity_index: Mapped[float] = mapped_column(Float)
    region: Mapped[str] = mapped_column(String(100))

    source: Mapped[str] = mapped_column(String(100), index=True, default="MOCK")
    taxonomy_id: Mapped[int | None] = mapped_column(ForeignKey("taxonomy.id"), nullable=True)
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))

    __table_args__ = (
        Index("idx_fisheries_data_geom", "geom", postgresql_using="gist"),
        Index("idx_fisheries_data_recorded_at", "recorded_at"),
    )


class EDNAData(Base):
    __tablename__ = "edna_data"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species: Mapped[str] = mapped_column(String(255), index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)

    concentration: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    depth: Mapped[int] = mapped_column(Integer)

    source: Mapped[str] = mapped_column(String(100), index=True, default="MOCK")
    taxonomy_id: Mapped[int | None] = mapped_column(ForeignKey("taxonomy.id"), nullable=True)
    geom: Mapped[str] = mapped_column(Geometry(geometry_type="POINT", srid=4326))

    __table_args__ = (
        Index("idx_edna_data_geom", "geom", postgresql_using="gist"),
        Index("idx_edna_data_recorded_at", "recorded_at"),
    )


class Correlation(Base):
    __tablename__ = "correlations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species: Mapped[str] = mapped_column(String(255), index=True)
    temperature: Mapped[float] = mapped_column(Float)
    salinity: Mapped[float] = mapped_column(Float)
    abundance: Mapped[int] = mapped_column(Integer)
    correlation_coefficient: Mapped[float] = mapped_column(Float)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True, default=datetime.now)


class Forecast(Base):
    __tablename__ = "forecasts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    species_name: Mapped[str] = mapped_column(String(255), index=True)
    forecasted_abundance: Mapped[float] = mapped_column(Float)
    model_version: Mapped[str] = mapped_column(String(50), default="rf_v1")
    forecast_for: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    features: Mapped[dict] = mapped_column(JSON, default=dict)


class IngestionLog(Base):
    __tablename__ = "ingestion_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    data_type: Mapped[str] = mapped_column(String(50), index=True)
    source: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(50), index=True)
    records_ingested: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
