"""Binary status entities for Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class SmartMatrixBinarySensorDescription(BinarySensorEntityDescription):
    """Description for a Smart Matrix binary status sensor."""


BINARY_SENSORS = (
    SmartMatrixBinarySensorDescription(
        key="online",
        translation_key="online",
        device_class=BinarySensorDeviceClass.CONNECTIVITY,
    ),
    SmartMatrixBinarySensorDescription(key="time_synced", translation_key="time_synced"),
    SmartMatrixBinarySensorDescription(key="display_enabled", translation_key="display_enabled"),
    SmartMatrixBinarySensorDescription(key="audio_available", translation_key="audio_available"),
    SmartMatrixBinarySensorDescription(key="speaker_connected", translation_key="speaker_connected"),
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
        self, coordinator, device_id: str, name: str, spec: SmartMatrixBinarySensorDescription
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self.entity_description = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"

    @property
    def is_on(self) -> Any:
        data = self.coordinator.data or {}
        if self.entity_description.key in {"audio_available", "speaker_connected"}:
            return bool((data.get("audio") or {}).get(self.entity_description.key.removeprefix("audio_"), False))
        return bool(data.get(self.entity_description.key, False))
