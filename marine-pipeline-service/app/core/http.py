from __future__ import annotations

import httpx
from tenacity import AsyncRetrying, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.config import get_settings


class ExternalAPIError(RuntimeError):
    pass


class HTTPClient:
    def __init__(self) -> None:
        settings = get_settings()
        self._timeout = settings.http_timeout_seconds
        self._max_retries = settings.http_max_retries
        self._wait_multiplier = settings.request_backoff_base

    async def _request(self, url: str, params: dict | None = None, headers: dict | None = None) -> httpx.Response:
        async for attempt in AsyncRetrying(
            retry=retry_if_exception_type((httpx.HTTPError, ExternalAPIError)),
            wait=wait_exponential(multiplier=self._wait_multiplier, min=1, max=20),
            stop=stop_after_attempt(self._max_retries),
            reraise=True,
        ):
            with attempt:
                async with httpx.AsyncClient(timeout=self._timeout, trust_env=False) as client:
                    response = await client.get(url, params=params, headers=headers)
                    if response.status_code >= 400:
                        raise ExternalAPIError(
                            f"HTTP {response.status_code} when calling {url}: {response.text[:200]}"
                        )
                    return response
        raise ExternalAPIError(f"No response returned from {url}")

    async def get_json(self, url: str, params: dict | None = None, headers: dict | None = None) -> dict:
        response = await self._request(url, params=params, headers=headers)
        return response.json()

    async def get_text(self, url: str, params: dict | None = None, headers: dict | None = None) -> str:
        response = await self._request(url, params=params, headers=headers)
        return response.text
