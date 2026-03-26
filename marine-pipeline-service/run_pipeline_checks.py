import json
import os
import urllib.error
import urllib.parse
import urllib.request

BASE = os.environ.get("PIPELINE_BASE_URL", "http://127.0.0.1:8090")


def call(method: str, path: str, params: dict | None = None, timeout: int = 30) -> dict:
    query = f"?{urllib.parse.urlencode(params)}" if params else ""
    url = f"{BASE}{path}{query}"
    data = b"" if method == "POST" else None
    req = urllib.request.Request(url, data=data, method=method)

    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            return {
                "ok": True,
                "status": response.status,
                "data": json.loads(response.read().decode("utf-8")),
            }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="ignore")
        return {"ok": False, "status": exc.code, "error": body[:500]}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "status": None, "error": str(exc)}


def main() -> None:
    results: dict[str, dict | list] = {}
    results["health"] = call("GET", "/health", timeout=10)
    results["ingest_ocean"] = call("POST", "/ingest/ocean", {"lat": 14.6, "lon": 121.0}, timeout=40)
    results["ingest_fisheries"] = call("POST", "/ingest/fisheries", timeout=40)
    results["ingest_edna"] = call("POST", "/ingest/edna", {"species_name": "Thunnus albacares"}, timeout=40)
    results["recompute_correlations"] = call("POST", "/correlations/recompute", {"radius_km": 50}, timeout=30)
    results["ocean_sample"] = call("GET", "/ocean", {"lat": 14.6, "lon": 121.0, "limit": 2}, timeout=20)
    correlations = call("GET", "/correlations", timeout=20)
    if correlations.get("ok"):
        correlations["data"] = correlations.get("data", [])[:5]
    results["correlations_sample"] = correlations
    results["forecast"] = call("GET", "/forecast", {"species": "Thunnus albacares"}, timeout=20)
    print(json.dumps(results, indent=2, default=str))


if __name__ == "__main__":
    main()
