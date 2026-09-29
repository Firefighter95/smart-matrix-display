"""Sensor entities exposed by Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, UnitOfTemperature, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import EntityCategory
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class SmartMatrixSensorDescription(SensorEntityDescription):
    """Description for a Smart Matrix status sensor."""

    diagnostic: bool = False


SENSORS = (
    SmartMatrixSensorDescription(key="mode", translation_key="mode"),
    SmartMatrixSensorDescription(key="brightness", translation_key="brightness", native_unit_of_measurement=PERCENTAGE),
    SmartMatrixSensorDescription(
        key="wifi_rssi", translation_key="wifi_signal", native_unit_of_measurement="dBm", diagnostic=True
    ),
    SmartMatrixSensorDescription(
        key="uptime", translation_key="uptime", native_unit_of_measurement=UnitOfTime.SECONDS, diagnostic=True
    ),
    SmartMatrixSensorDescription(key="firmware", translation_key="firmware", diagnostic=True),
    SmartMatrixSensorDescription(key="resolution", translation_key="resolution", diagnostic=True),
    SmartMatrixSensorDescription(key="active_layout", translation_key="active_layout"),
    SmartMatrixSensorDescription(key="profile", translation_key="active_profile"),
    SmartMatrixSensorDescription(key="queue_length", translation_key="queue_length", diagnostic=True),
    SmartMatrixSensorDescription(key="heap_free", translation_key="heap_free", diagnostic=True),
    SmartMatrixSensorDescription(key="psram_free", translation_key="psram_free", diagnostic=True),
    SmartMatrixSensorDescription(key="hardware_profile", translation_key="hardware_profile", diagnostic=True),
    SmartMatrixSensorDescription(key="panel_profile", translation_key="panel_profile", diagnostic=True),
    SmartMatrixSensorDescription(key="scan_rows", translation_key="scan_rows", diagnostic=True),
    SmartMatrixSensorDescription(key="pin_mapping", translation_key="pin_mapping", diagnostic=True),
    SmartMatrixSensorDescription(key="ip", translation_key="ip_address", diagnostic=True),
    SmartMatrixSensorDescription(key="hostname", translation_key="hostname", diagnostic=True),
    SmartMatrixSensorDescription(key="weather_condition", translation_key="weather_condition"),
    SmartMatrixSensorDescription(key="weather_code", translation_key="weather_code"),
    SmartMatrixSensorDescription(key="weather_description", translation_key="weather_description"),
    SmartMatrixSensorDescription(key="weather_forecast", translation_key="weather_forecast"),
    SmartMatrixSensorDescription(key="weather_warning", translation_key="weather_warning"),
    SmartMatrixSensorDescription(key="weather_temperature", translation_key="weather_temperature", native_unit_of_measurement=UnitOfTemperature.CELSIUS),
    SmartMatrixSensorDescription(key="weather_wind", translation_key="weather_wind", native_unit_of_measurement="m/s"),
    SmartMatrixSensorDescription(key="weather_rain_today", translation_key="weather_rain_today", native_unit_of_measurement=PERCENTAGE),
    SmartMatrixSensorDescription(key="weather_rain_tomorrow", translation_key="weather_rain_tomorrow", native_unit_of_measurement=PERCENTAGE),
    SmartMatrixSensorDescription(key="weather_radiation", translation_key="weather_radiation", native_unit_of_measurement="W/m²"),
    SmartMatrixSensorDescription(key="weather_wind_direction", translation_key="weather_wind_direction"),
    SmartMatrixSensorDescription(key="weather_sun_state", translation_key="weather_sun_state"),
    SmartMatrixSensorDescription(key="audio_state", translation_key="audio_state"),
    SmartMatrixSensorDescription(key="audio_input_level", translation_key="audio_input_level", native_unit_of_measurement=PERCENTAGE, diagnostic=True),
    SmartMatrixSensorDescription(key="audio_microphones", translation_key="audio_microphones", diagnostic=True),
    SmartMatrixSensorDescription(key="audio_wake_word_engine", translation_key="audio_wake_word_engine", diagnostic=True),
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
        self, coordinator, device_id: str, name: str, spec: SmartMatrixSensorDescription
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self.entity_description = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"
        self._attr_entity_category = (
            EntityCategory.DIAGNOSTIC if spec.diagnostic else None
        )

    @property
    def native_value(self) -> Any:
        data = self.coordinator.data or {}
        key = self.entity_description.key
        weather = data.get("weather") or {}
        if self.entity_description.key == "weather_temperature":
            return weather.get("temperatureC")
        if self.entity_description.key == "weather_wind":
            wind_kph = weather.get("windSpeedKph")
            return round(wind_kph / 3.6, 1) if isinstance(wind_kph, (int, float)) else None
        weather_fields = {
            "weather_condition": "condition",
            "weather_code": "weatherCode",
            "weather_description": "description",
            "weather_forecast": "forecast",
            "weather_warning": "warning",
            "weather_rain_today": "precipitationTodayProbability",
            "weather_rain_tomorrow": "precipitationTomorrowProbability",
            "weather_radiation": "globalRadiationWm2",
            "weather_wind_direction": "windDirection",
            "weather_sun_state": "sunState",
        }
        if key in weather_fields:
            return weather.get(weather_fields[key])
        if self.entity_description.key.startswith("audio_"):
            audio = data.get("audio") or {}
            return audio.get(self.entity_description.key.removeprefix("audio_"))
        return data.get(self.entity_description.key)
