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
            return await self.api.async_get_status()
        except SmartMatrixApiError as err:
            raise UpdateFailed(str(err)) from err
