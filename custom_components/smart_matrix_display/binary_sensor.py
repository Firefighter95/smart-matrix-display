"""Binary status entities for Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class _BinarySensorSpec:
    key: str
    translation_key: str
    device_class: BinarySensorDeviceClass | None = None


BINARY_SENSORS = (
    _BinarySensorSpec(
        key="online",
        translation_key="online",
        device_class=BinarySensorDeviceClass.CONNECTIVITY,
    ),
    _BinarySensorSpec(key="time_synced", translation_key="time_synced"),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up connectivity and time-sync entities."""

    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        SmartMatrixBinarySensor(
            runtime["coordinator"], runtime["device_id"], runtime["name"], spec
        )
        for spec in BINARY_SENSORS
    )


class SmartMatrixBinarySensor(SmartMatrixEntity, BinarySensorEntity):
    """A binary sensor backed by a field in GET /api/v1/status."""

    def __init__(
        self, coordinator, device_id: str, name: str, spec: _BinarySensorSpec
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self.entity_description = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"
        self._attr_translation_key = spec.translation_key
        self._attr_device_class = spec.device_class

    @property
    def is_on(self) -> Any:
        return bool(
            (self.coordinator.data or {}).get(self.entity_description.key, False)
        )
