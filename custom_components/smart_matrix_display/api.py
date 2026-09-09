"""Async local API client for Smart Matrix Display devices."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import async_timeout
from aiohttp import ClientSession

from .const import DEFAULT_TIMEOUT


class SmartMatrixApiError(Exception):
    """Raised when a Smart Matrix Display API request fails."""


class SmartMatrixApiClient:
    """Small dependency-free client for the versioned ESP32 REST API."""

    def __init__(
        self,
        session: ClientSession,
        host: str,
        port: int,
        token: str | None = None,
        timeout: int = DEFAULT_TIMEOUT,
    ) -> None:
        self._session = session
        self._base_url = f"http://{host.strip().rstrip('/')}:{port}"
        self._token = token or ""
        self._timeout = timeout

    @property
    def base_url(self) -> str:
        """Return the configured device URL."""

        return self._base_url

    async def _request(
        self,
        method: str,
        path: str,
        payload: Mapping[str, Any] | None = None,
    ) -> dict[str, Any]:
        headers = {"Accept": "application/json"}
        if self._token:
            headers["X-Smart-Matrix-Token"] = self._token

        try:
            async with (
                async_timeout.timeout(self._timeout),
                self._session.request(
                    method,
                    f"{self._base_url}{path}",
                    json=payload,
                    headers=headers,
                ) as response,
            ):
                body = await response.json(content_type=None)
                if response.status >= 400:
                    detail = body.get("error", {}) if isinstance(body, dict) else {}
                    message = (
                        detail.get("message") if isinstance(detail, dict) else None
                    )
                    raise SmartMatrixApiError(
                        message or f"Device returned HTTP {response.status}"
                    )
                if not isinstance(body, dict):
                    raise SmartMatrixApiError("Device returned an invalid JSON object")
                if body.get("ok") is False:
                    detail = body.get("error", {})
                    message = (
                        detail.get("message") if isinstance(detail, dict) else None
                    )
                    raise SmartMatrixApiError(message or "Device rejected the request")
                data = body.get("data")
                return data if isinstance(data, dict) else body
        except SmartMatrixApiError:
            raise
        except Exception as err:
            raise SmartMatrixApiError(str(err)) from err

    async def async_get_status(self) -> dict[str, Any]:
        """Fetch current device status."""

        return await self._request("GET", "/api/v1/status")

    async def async_get_config(self) -> dict[str, Any]:
        """Fetch persisted device configuration."""

        return await self._request("GET", "/api/v1/config")

    async def async_send_message(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        """Show a message on the display."""

        return await self._request("POST", "/api/v1/message", payload)

    async def async_send_weather(self, payload: Mapping[str, Any]) -> dict[str, Any]:
        """Send a normalized Home Assistant weather snapshot."""

        return await self._request("PUT", "/api/v1/weather", payload)

    async def async_clear_display(self) -> dict[str, Any]:
        """Clear the active message and return to the clock."""

        return await self._request("POST", "/api/v1/clear")

    async def async_restart(self) -> dict[str, Any]:
        """Ask the device to restart."""

        return await self._request("POST", "/api/v1/restart")
