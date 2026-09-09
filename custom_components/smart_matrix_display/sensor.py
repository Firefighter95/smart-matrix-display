"""Sensor entities exposed by Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class _SensorSpec:
    key: str
    translation_key: str
    unit: str | None = None
    diagnostic: bool = False


SENSORS = (
    _SensorSpec(key="mode", translation_key="mode"),
    _SensorSpec(key="brightness", translation_key="brightness", unit=PERCENTAGE),
    _SensorSpec(
        key="wifi_rssi", translation_key="wifi_signal", unit="dBm", diagnostic=True
    ),
    _SensorSpec(
        key="uptime", translation_key="uptime", unit=UnitOfTime.SECONDS, diagnostic=True
    ),
    _SensorSpec(key="firmware", translation_key="firmware", diagnostic=True),
    _SensorSpec(key="resolution", translation_key="resolution", diagnostic=True),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up status sensors for one display."""

    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        SmartMatrixSensor(
            runtime["coordinator"], runtime["device_id"], runtime["name"], spec
        )
        for spec in SENSORS
    )


class SmartMatrixSensor(SmartMatrixEntity, SensorEntity):
    """A sensor backed by a field in GET /api/v1/status."""

    def __init__(
        self, coordinator, device_id: str, name: str, spec: _SensorSpec
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self.entity_description = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"
        self._attr_translation_key = spec.translation_key
        self._attr_native_unit_of_measurement = spec.unit
        self._attr_entity_category = (
            EntityCategory.DIAGNOSTIC if spec.diagnostic else None
        )

    @property
    def native_value(self) -> Any:
        return (self.coordinator.data or {}).get(self.entity_description.key)
