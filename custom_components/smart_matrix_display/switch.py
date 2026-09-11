"""Power switch for Smart Matrix Display."""

from __future__ import annotations

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SmartMatrixPowerSwitch(runtime["coordinator"], runtime["api"], runtime["device_id"], runtime["name"])])


class SmartMatrixPowerSwitch(SmartMatrixEntity, SwitchEntity):
    """Display output power state."""

    _attr_translation_key = "display_power"

    def __init__(self, coordinator, api, device_id: str, name: str) -> None:
        super().__init__(coordinator, device_id, name)
        self._api = api
        self._attr_unique_id = f"{device_id}_display_power"

    @property
    def is_on(self) -> bool:
        return bool((self.coordinator.data or {}).get("display_enabled", False))

    async def async_turn_on(self, **kwargs) -> None:
        await self._api.async_set_power(True)
        await self.coordinator.async_request_refresh()

    async def async_turn_off(self, **kwargs) -> None:
        await self._api.async_set_power(False)
        await self.coordinator.async_request_refresh()
