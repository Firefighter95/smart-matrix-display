"""Polling coordinator for Smart Matrix Display devices."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import SmartMatrixApiClient, SmartMatrixApiError
from .const import DEFAULT_SCAN_INTERVAL, DOMAIN

_LOGGER = logging.getLogger(__name__)


class SmartMatrixCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Retrieve device status on a shared interval for all entities."""

    def __init__(
        self, hass: HomeAssistant, api: SmartMatrixApiClient, name: str
    ) -> None:
        self.api = api
        super().__init__(
            hass,
            _LOGGER,
            name=f"{DOMAIN}_{name}",
            update_method=self._async_update_data,
            update_interval=timedelta(seconds=DEFAULT_SCAN_INTERVAL),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        try:
            status = await self.api.async_get_status()
            previous = self.data or {}
            previous_uptime = previous.get("uptime")
            current_uptime = status.get("uptime")
            status["_device_rebooted"] = (
                isinstance(previous_uptime, (int, float))
                and isinstance(current_uptime, (int, float))
                and current_uptime < previous_uptime
            )
            try:
                status["weather"] = await self.api.async_get_weather()
            except SmartMatrixApiError:
                # Older firmware may not expose this endpoint yet.
                status.setdefault("weather", {})
            # Keep configuration-backed controls readable even on firmware
            # versions that do not yet expose the richer runtime status.
            try:
                config = await self.api.async_get_config()
            except SmartMatrixApiError:
                config = {}
            try:
                status["audio"] = await self.api.async_get_audio_status()
            except SmartMatrixApiError:
                # Keep older firmware compatible with the HACS integration.
                status.setdefault("audio", {"available": False, "state": "IDLE"})
            layouts = config.get("layouts", [])
            profiles = config.get("profiles", [])
            status.setdefault(
                "layouts",
                [item.get("id") for item in layouts if isinstance(item, dict) and item.get("id")],
            )
            status.setdefault("active_layout", config.get("activeLayoutId") or config.get("clock", {}).get("layout"))
            status.setdefault(
                "profiles",
                [item.get("id") for item in profiles if isinstance(item, dict) and item.get("id")],
            )
            status.setdefault("profile", config.get("activeProfileId", "normal"))
            return status
        except SmartMatrixApiError as err:
            raise UpdateFailed(str(err)) from err
