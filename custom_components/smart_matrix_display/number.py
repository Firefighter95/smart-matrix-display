"""Number entities for Smart Matrix Display."""

from __future__ import annotations

from homeassistant.components.number import NumberEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SmartMatrixBrightnessNumber(runtime["coordinator"], runtime["api"], runtime["device_id"], runtime["name"])])


class SmartMatrixBrightnessNumber(SmartMatrixEntity, NumberEntity):
    """Manual brightness control."""

    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_translation_key = "brightness_control"

    def __init__(self, coordinator, api, device_id: str, name: str) -> None:
        super().__init__(coordinator, device_id, name)
        self._api = api
        self._attr_unique_id = f"{device_id}_brightness_control"

    @property
    def native_value(self) -> float:
        return float((self.coordinator.data or {}).get("brightness", 0))

    async def async_set_native_value(self, value: float) -> None:
        await self._api.async_set_brightness(round(value))
        await self.coordinator.async_request_refresh()
