"""Select entities for Smart Matrix Display profiles and layouts."""

from __future__ import annotations

from homeassistant.components.select import SelectEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        SmartMatrixLayoutSelect(runtime["coordinator"], runtime["api"], runtime["device_id"], runtime["name"]),
        SmartMatrixProfileSelect(runtime["coordinator"], runtime["api"], runtime["device_id"], runtime["name"]),
    ])


class _SmartMatrixSelect(SmartMatrixEntity, SelectEntity):
    def __init__(self, coordinator, api, device_id: str, name: str, suffix: str) -> None:
        super().__init__(coordinator, device_id, name)
        self._api = api
        self._attr_unique_id = f"{device_id}_{suffix}"


class SmartMatrixLayoutSelect(_SmartMatrixSelect):
    _attr_translation_key = "active_layout"

    def __init__(self, coordinator, api, device_id: str, name: str) -> None:
        super().__init__(coordinator, api, device_id, name, "active_layout")

    @property
    def options(self) -> list[str]:
        return [str(value) for value in (self.coordinator.data or {}).get("layouts", [])] or [str((self.coordinator.data or {}).get("active_layout", "clock-main"))]

    @property
    def current_option(self) -> str | None:
        return (self.coordinator.data or {}).get("active_layout")

    async def async_select_option(self, option: str) -> None:
        await self._api.async_set_layout(option)
        await self.coordinator.async_request_refresh()


class SmartMatrixProfileSelect(_SmartMatrixSelect):
    _attr_translation_key = "active_profile"

    def __init__(self, coordinator, api, device_id: str, name: str) -> None:
        super().__init__(coordinator, api, device_id, name, "active_profile")

    @property
    def options(self) -> list[str]:
        return ["normal", "night", "away", "demo", "fire"]

    @property
    def current_option(self) -> str | None:
        return (self.coordinator.data or {}).get("profile", "normal")

    async def async_select_option(self, option: str) -> None:
        await self._api.async_set_profile(option)
        await self.coordinator.async_request_refresh()
