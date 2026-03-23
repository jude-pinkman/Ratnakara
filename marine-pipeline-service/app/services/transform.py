from __future__ import annotations

from collections.abc import Iterable
from datetime import timezone

import numpy as np
import pandas as pd

REQUIRED_FIELDS: dict[str, set[str]] = {
    "ocean": {"latitude", "longitude", "recorded_at"},
    "fisheries": {"latitude", "longitude", "recorded_at", "species_name", "abundance"},
    "edna": {"latitude", "longitude", "recorded_at"},
}


def _to_dataframe(data: pd.DataFrame | Iterable[dict]) -> pd.DataFrame:
    if isinstance(data, pd.DataFrame):
        return data.copy()
    return pd.DataFrame(list(data))


def _normalize_coordinates(df: pd.DataFrame) -> pd.DataFrame:
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce").clip(-90, 90)
    lon = pd.to_numeric(df["longitude"], errors="coerce")
    df["longitude"] = ((lon + 180) % 360) - 180
    return df


def _convert_ocean_units(df: pd.DataFrame) -> pd.DataFrame:
    if "temperature" in df.columns:
        temp = pd.to_numeric(df["temperature"], errors="coerce")
        unit = df.get("temperature_unit", "celsius")
        if isinstance(unit, pd.Series):
            unit = unit.fillna("celsius").str.lower()
            df["temperature_c"] = np.where(unit.eq("kelvin"), temp - 273.15, temp)
        else:
            df["temperature_c"] = temp - 273.15 if str(unit).lower() == "kelvin" else temp

    if "salinity" in df.columns:
        salinity = pd.to_numeric(df["salinity"], errors="coerce")
        unit = df.get("salinity_unit", "psu")
        if isinstance(unit, pd.Series):
            unit = unit.fillna("psu").str.lower()
            df["salinity_psu"] = np.where(unit.isin(["g/kg", "ppt"]), salinity, salinity)
        else:
            df["salinity_psu"] = salinity

    if "oxygen" in df.columns:
        oxygen = pd.to_numeric(df["oxygen"], errors="coerce")
        unit = df.get("oxygen_unit", "mg/l")
        if isinstance(unit, pd.Series):
            unit = unit.fillna("mg/l").str.lower()
            df["oxygen_mg_l"] = np.where(unit.eq("umol/kg"), oxygen * 0.032, oxygen)
        else:
            df["oxygen_mg_l"] = oxygen * 0.032 if str(unit).lower() == "umol/kg" else oxygen

    for col in ["chlorophyll", "ph", "current_speed"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "chlorophyll" in df.columns:
        df["chlorophyll_mg_m3"] = df["chlorophyll"]
    if "current_speed" in df.columns:
        df["current_speed_ms"] = df["current_speed"]

    return df


def _validate_required_fields(df: pd.DataFrame, data_type: str) -> None:
    required = REQUIRED_FIELDS[data_type]
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns for {data_type}: {sorted(missing)}")


def _clean_nulls(df: pd.DataFrame, data_type: str) -> pd.DataFrame:
    required = list(REQUIRED_FIELDS[data_type])
    df = df.dropna(subset=required)
    return df


def transform_to_common_schema(data: pd.DataFrame | Iterable[dict], data_type: str) -> pd.DataFrame:
    if data_type not in REQUIRED_FIELDS:
        raise ValueError(f"Unsupported data_type: {data_type}")

    df = _to_dataframe(data)
    _validate_required_fields(df, data_type)

    df["recorded_at"] = pd.to_datetime(df["recorded_at"], utc=True, errors="coerce")
    df = _normalize_coordinates(df)

    if data_type == "ocean":
        df = _convert_ocean_units(df)

    df = _clean_nulls(df, data_type)
    df["recorded_at"] = df["recorded_at"].dt.tz_convert(timezone.utc)
    df["data_type"] = data_type

    protected = {
        "location",
        "latitude",
        "longitude",
        "recorded_at",
        "data_type",
        "species_name",
        "abundance",
        "temperature_c",
        "salinity_psu",
        "oxygen_mg_l",
        "chlorophyll_mg_m3",
        "ph",
        "current_speed_ms",
        "biodiversity_index",
        "read_count",
    }

    df["attributes"] = df.apply(
        lambda row: {k: row[k] for k in df.columns if k not in protected and pd.notna(row[k])}, axis=1
    )

    common_columns = ["location", "latitude", "longitude", "recorded_at", "data_type", "attributes"]
    return df[[c for c in common_columns if c in df.columns] + [c for c in df.columns if c not in common_columns]]
