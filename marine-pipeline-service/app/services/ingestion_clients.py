from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from io import StringIO
import logging

import pandas as pd
from pygbif import occurrences, species

from app.core.config import get_settings
from app.core.http import HTTPClient


logger = logging.getLogger(__name__)


INDIAN_MARINE_BOUNDS = {
    "min_lat": -10.0,
    "max_lat": 25.0,
    "min_lon": 65.0,
    "max_lon": 98.0,
}

INDIAN_MARINE_WKT = (
    "POLYGON(("
    "65 -10, "
    "98 -10, "
    "98 25, "
    "65 25, "
    "65 -10"
    "))"
)


def _within_indian_marine_bounds(lat: float | None, lon: float | None) -> bool:
    if lat is None or lon is None:
        return False
    return (
        INDIAN_MARINE_BOUNDS["min_lat"] <= lat <= INDIAN_MARINE_BOUNDS["max_lat"]
        and INDIAN_MARINE_BOUNDS["min_lon"] <= lon <= INDIAN_MARINE_BOUNDS["max_lon"]
    )


def _parse_station_list(raw_value: str) -> list[tuple[str, float, float]]:
    stations: list[tuple[str, float, float]] = []
    for token in [part.strip() for part in raw_value.split(",") if part.strip()]:
        parts = [p.strip() for p in token.split(":")]
        if len(parts) != 3:
            raise ValueError(f"Invalid station format: {token}. Expected station_id:lat:lon")
        station_id, lat_s, lon_s = parts
        stations.append((station_id, float(lat_s), float(lon_s)))
    return stations


class OpenDataClients:
    def __init__(self, http_client: HTTPClient | None = None) -> None:
        self.settings = get_settings()
        self.http = http_client or HTTPClient()

    async def fetch_noaa_ocean_data(self, lat: float, lon: float, days_back: int = 1) -> pd.DataFrame:
        _ = (lat, lon, days_back)
        ndbc_df = await self.fetch_ndbc_realtime_data()
        coops_df = await self.fetch_noaa_coops_realtime_data()
        frames = [df for df in [ndbc_df, coops_df] if not df.empty]
        if not frames:
            raise RuntimeError("No realtime ocean records returned from NDBC/NOAA CO-OPS")
        return pd.concat(frames, ignore_index=True, sort=False)

    async def fetch_ndbc_realtime_data(self) -> pd.DataFrame:
        stations = _parse_station_list(self.settings.ndbc_station_list)
        records: list[dict] = []

        for station_id, lat, lon in stations:
            raw_text = await self.http.get_text(f"{self.settings.ndbc_realtime_base_url}/{station_id}.txt")
            df = pd.read_csv(
                StringIO(raw_text),
                sep=r"\s+",
                engine="python",
                skiprows=[1],
                na_values=["MM"],
            )
            if df.empty:
                continue

            year_col = "#YY" if "#YY" in df.columns else "YY"
            required_cols = [year_col, "MM", "DD", "hh", "mm"]
            if any(col not in df.columns for col in required_cols):
                logger.warning("NDBC response for station %s missing timestamp columns", station_id)
                continue

            for _, row in df.tail(96).iterrows():
                try:
                    year = int(row[year_col])
                    if year < 100:
                        year += 2000
                    recorded_at = datetime(
                        year,
                        int(row["MM"]),
                        int(row["DD"]),
                        int(row["hh"]),
                        int(row["mm"]),
                        tzinfo=timezone.utc,
                    )
                except Exception:  # noqa: BLE001
                    continue

                records.append(
                    {
                        "location": f"NDBC-{station_id}",
                        "latitude": lat,
                        "longitude": lon,
                        "recorded_at": recorded_at.isoformat(),
                        "temperature": row.get("WTMP"),
                        "salinity": row.get("SAL"),
                        "oxygen": row.get("DOX") if "DOX" in df.columns else None,
                        "current_speed": row.get("WSPD"),
                        "source": "NOAA_NDBC",
                        "attributes": {
                            "station_id": station_id,
                            "wave_height_m": row.get("WVHT"),
                            "pressure_hpa": row.get("PRES"),
                            "wind_direction_deg": row.get("WDIR"),
                        },
                    }
                )

        return pd.DataFrame(records)

    async def fetch_noaa_coops_realtime_data(self) -> pd.DataFrame:
        stations = _parse_station_list(self.settings.noaa_coops_station_list)
        records: list[dict] = []

        for station_id, lat, lon in stations:
            payload = await self.http.get_json(
                self.settings.noaa_coops_base_url,
                params={
                    "product": "water_level",
                    "application": "marine-data-platform",
                    "format": "json",
                    "datum": "MSL",
                    "units": "metric",
                    "time_zone": "gmt",
                    "date": "latest",
                    "station": station_id,
                },
            )
            for row in payload.get("data", []):
                records.append(
                    {
                        "location": f"NOAA-COOPS-{station_id}",
                        "latitude": lat,
                        "longitude": lon,
                        "recorded_at": row.get("t"),
                        "source": "NOAA_COOPS",
                        "attributes": {
                            "station_id": station_id,
                            "water_level_m": row.get("v"),
                            "quality_flag": row.get("f"),
                        },
                    }
                )

        return pd.DataFrame(records)

    async def fetch_copernicus_ocean_data(self, lat: float, lon: float) -> pd.DataFrame:
        headers = {}
        if self.settings.copernicus_api_key:
            headers["Authorization"] = f"Bearer {self.settings.copernicus_api_key}"

        try:
            payload = await self.http.get_json(
                f"{self.settings.copernicus_base_url}/catalog/positions",
                params={"lat": lat, "lon": lon},
                headers=headers,
            )
        except Exception:
            # Copernicus endpoint availability varies by tenant and auth scope.
            # Return an empty frame so ingestion can proceed with NOAA data.
            return pd.DataFrame(
                columns=[
                    "location",
                    "latitude",
                    "longitude",
                    "recorded_at",
                    "current_speed",
                    "chlorophyll",
                    "ph",
                ]
            )

        records: list[dict] = []
        for item in payload.get("data", []):
            records.append(
                {
                    "location": item.get("name"),
                    "latitude": item.get("lat", lat),
                    "longitude": item.get("lon", lon),
                    "recorded_at": item.get("time", datetime.now(timezone.utc).isoformat()),
                    "current_speed": item.get("currentSpeed"),
                    "chlorophyll": item.get("chlorophyll"),
                    "ph": item.get("ph"),
                }
            )
        return pd.DataFrame(records)

    async def fetch_obis_occurrences(self, scientific_name: str | None = None, limit: int = 200) -> pd.DataFrame:
        params = {"size": limit}
        if scientific_name:
            params["scientificname"] = scientific_name

        payload = await self.http.get_json(f"{self.settings.obis_base_url}/occurrence", params=params)
        records: list[dict] = []
        for row in payload.get("results", []):
            lat = row.get("decimalLatitude")
            lon = row.get("decimalLongitude")
            try:
                lat_f = float(lat) if lat is not None else None
                lon_f = float(lon) if lon is not None else None
            except (TypeError, ValueError):
                continue

            if not _within_indian_marine_bounds(lat_f, lon_f):
                continue

            records.append(
                {
                    "species_name": row.get("scientificName"),
                    "latitude": lat_f,
                    "longitude": lon_f,
                    "location": row.get("locality") or row.get("waterBody"),
                    "recorded_at": row.get("eventDate"),
                    "read_count": row.get("individualCount"),
                    "biodiversity_index": row.get("shannon"),
                    "source": "OBIS",
                }
            )
        return pd.DataFrame(records)

    async def fetch_gbif_species_match(self, species_name: str) -> dict:
        def _search() -> dict:
            return species.name_backbone(name=species_name) or {}

        return await asyncio.to_thread(_search)

    async def fetch_gbif_marine_occurrences(self, limit: int = 500) -> pd.DataFrame:
        rows = await self._gbif_search(
            limit=limit,
            marine=True,
            hasCoordinate=True,
            occurrenceStatus="PRESENT",
            geometry=INDIAN_MARINE_WKT,
        )

        records: list[dict] = []
        for row in rows:
            parsed = _extract_gbif_occurrence(row)
            if not parsed:
                continue
            records.append(
                {
                    "location": row.get("locality") or row.get("waterBody") or row.get("datasetName") or "gbif-marine",
                    "latitude": parsed["latitude"],
                    "longitude": parsed["longitude"],
                    "recorded_at": parsed["recorded_at"],
                    "source": "GBIF_MARINE",
                    "attributes": {
                        "gbif_key": row.get("key"),
                        "dataset_name": row.get("datasetName"),
                        "basis_of_record": row.get("basisOfRecord"),
                        "scientific_name": row.get("scientificName"),
                    },
                }
            )

        return pd.DataFrame(records)

    async def fetch_gbif_fisheries_occurrences(self, limit: int = 500) -> pd.DataFrame:
        rows = await self._gbif_search(
            limit=limit,
            marine=True,
            hasCoordinate=True,
            occurrenceStatus="PRESENT",
            geometry=INDIAN_MARINE_WKT,
        )

        fish_keywords = ("fish", "shark", "ray", "tuna", "mackerel", "sardine", "anchovy")
        fish_classes = {"actinopterygii", "chondrichthyes", "myxini", "cephalaspidomorphi"}
        records: list[dict] = []

        for row in rows:
            parsed = _extract_gbif_occurrence(row)
            if not parsed:
                continue

            class_name = str(row.get("class") or "").lower()
            sci = str(row.get("scientificName") or "")
            common = str(row.get("vernacularName") or "")
            combined = f"{sci} {common}".lower()

            if class_name not in fish_classes and not any(k in combined for k in fish_keywords):
                continue

            abundance_raw = row.get("individualCount")
            try:
                abundance = float(abundance_raw) if abundance_raw is not None else 1.0
            except (TypeError, ValueError):
                abundance = 1.0

            records.append(
                {
                    "species_name": sci or "unknown",
                    "abundance": max(abundance, 1.0),
                    "recorded_at": parsed["recorded_at"],
                    "latitude": parsed["latitude"],
                    "longitude": parsed["longitude"],
                    "location": row.get("locality") or row.get("waterBody") or row.get("datasetName") or "gbif-fisheries",
                    "source": "GBIF_FISHERIES",
                    "attributes": {
                        "gbif_key": row.get("key"),
                        "dataset_name": row.get("datasetName"),
                        "basis_of_record": row.get("basisOfRecord"),
                        "individual_count_raw": abundance_raw,
                        "class": row.get("class"),
                    },
                }
            )

        return pd.DataFrame(records)

    async def fetch_gbif_edna_occurrences(self, species_name: str | None = None, limit: int = 500) -> pd.DataFrame:
        params: dict = {
            "limit": limit,
            "marine": True,
            "hasCoordinate": True,
            "occurrenceStatus": "PRESENT",
            "geometry": INDIAN_MARINE_WKT,
        }
        if species_name:
            params["scientificName"] = species_name
        else:
            params["basisOfRecord"] = "MATERIAL_SAMPLE"

        rows = await self._gbif_search(**params)
        edna_terms = ("edna", "environmental dna", "metabarcoding", "amplicon", "sequencing")
        records: list[dict] = []

        for row in rows:
            parsed = _extract_gbif_occurrence(row)
            if not parsed:
                continue

            remarks = str(row.get("occurrenceRemarks") or "")
            protocol = str(row.get("samplingProtocol") or "")
            basis = str(row.get("basisOfRecord") or "")
            evidence = f"{remarks} {protocol} {basis}".lower()

            if species_name is None:
                is_edna_like = any(term in evidence for term in edna_terms) or basis.upper() == "MATERIAL_SAMPLE"
                if not is_edna_like:
                    continue

            count_raw = row.get("individualCount")
            try:
                read_count = float(count_raw) if count_raw is not None else None
            except (TypeError, ValueError):
                read_count = None

            records.append(
                {
                    "species_name": row.get("scientificName") or species_name,
                    "latitude": parsed["latitude"],
                    "longitude": parsed["longitude"],
                    "location": row.get("locality") or row.get("waterBody") or row.get("datasetName") or "gbif-edna",
                    "recorded_at": parsed["recorded_at"],
                    "read_count": read_count,
                    "biodiversity_index": None,
                    "source": "GBIF_EDNA",
                    "attributes": {
                        "gbif_key": row.get("key"),
                        "dataset_name": row.get("datasetName"),
                        "basis_of_record": row.get("basisOfRecord"),
                        "sampling_protocol": row.get("samplingProtocol"),
                        "occurrence_remarks": row.get("occurrenceRemarks"),
                    },
                }
            )

        return pd.DataFrame(records)

    async def _gbif_search(self, **params) -> list[dict]:
        def _search() -> list[dict]:
            payload = occurrences.search(**params)
            return payload.get("results", []) if isinstance(payload, dict) else []

        return await asyncio.to_thread(_search)

    async def fetch_fao_fisheries(self, area_code: str = "5000", page_size: int = 1000) -> pd.DataFrame:
        _ = (area_code, page_size)
        raise RuntimeError("FAO is not a realtime fisheries source. Configure AIS_STREAM_URL for live fisheries ingestion.")

    async def fetch_ais_fisheries(self) -> pd.DataFrame:
        if not self.settings.ais_stream_url:
            raise RuntimeError("AIS_STREAM_URL is not configured")

        payload = await self.http.get_json(self.settings.ais_stream_url)
        rows = payload if isinstance(payload, list) else payload.get("data", [])
        records: list[dict] = []
        for row in rows:
            lat = row.get("latitude")
            lon = row.get("longitude")
            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except (TypeError, ValueError):
                continue

            if not _within_indian_marine_bounds(lat_f, lon_f):
                continue

            records.append(
                {
                    "species_name": row.get("species") or row.get("target_species") or "unknown",
                    "abundance": row.get("catch_weight_kg") or row.get("abundance") or 1,
                    "recorded_at": row.get("timestamp") or datetime.now(timezone.utc).isoformat(),
                    "latitude": lat_f,
                    "longitude": lon_f,
                    "location": row.get("location") or row.get("vessel_id") or "ais-live",
                    "source": "AIS_LIVE",
                }
            )
        return pd.DataFrame(records)

    async def fetch_live_edna(self, species_name: str | None = None) -> pd.DataFrame:
        if not self.settings.edna_stream_url:
            raise RuntimeError("EDNA_STREAM_URL is not configured")

        params = {"species": species_name} if species_name else None
        payload = await self.http.get_json(self.settings.edna_stream_url, params=params)
        rows = payload if isinstance(payload, list) else payload.get("data", [])
        records: list[dict] = []
        for row in rows:
            lat = row.get("latitude")
            lon = row.get("longitude")
            try:
                lat_f = float(lat)
                lon_f = float(lon)
            except (TypeError, ValueError):
                continue

            if not _within_indian_marine_bounds(lat_f, lon_f):
                continue

            records.append(
                {
                    "species_name": row.get("species_name") or row.get("species"),
                    "latitude": lat_f,
                    "longitude": lon_f,
                    "location": row.get("location") or "edna-live",
                    "recorded_at": row.get("recorded_at") or row.get("timestamp"),
                    "read_count": row.get("read_count"),
                    "biodiversity_index": row.get("biodiversity_index"),
                    "source": "EDNA_LIVE",
                }
            )
        return pd.DataFrame(records)


def _extract_gbif_occurrence(row: dict) -> dict | None:
    lat = row.get("decimalLatitude")
    lon = row.get("decimalLongitude")
    if lat is None or lon is None:
        return None

    try:
        lat_f = float(lat)
        lon_f = float(lon)
    except (TypeError, ValueError):
        return None

    if not _within_indian_marine_bounds(lat_f, lon_f):
        return None

    recorded_at = row.get("eventDate") or row.get("modified") or row.get("lastInterpreted")
    if not recorded_at:
        return None

    return {
        "latitude": lat_f,
        "longitude": lon_f,
        "recorded_at": recorded_at,
    }
