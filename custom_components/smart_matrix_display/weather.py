"""Convert a Home Assistant weather entity into the Smart Matrix contract."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant, State
from homeassistant.exceptions import HomeAssistantError

from .api import SmartMatrixApiError

UNKNOWN_STATES = {"unknown", "unavailable", "none"}


def _number(value: Any) -> float | None:
    try:
        if value is None or str(value).lower() in UNKNOWN_STATES:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _to_celsius(value: float, unit: str | None) -> float:
    normalized = (unit or "°C").strip().lower()
    if normalized in {"°f", "f", "fahrenheit"}:
        return (value - 32) * 5 / 9
    if normalized in {"k", "kelvin"}:
        return value - 273.15
    return value


def _to_kph(value: float, unit: str | None) -> float:
    normalized = (unit or "km/h").strip().lower().replace(" ", "")
    if normalized in {"m/s", "ms-1", "meter/second"}:
        return value * 3.6
    if normalized in {"mph", "mi/h"}:
        return value * 1.609344
    if normalized in {"kn", "kt", "knot", "knots"}:
        return value * 1.852
    return value


def _attribute(attributes: dict[str, Any], *names: str) -> Any:
    normalized = {str(key).lower(): value for key, value in attributes.items()}
    for name in names:
        value = normalized.get(name.lower())
        if value is not None and str(value).strip().lower() not in UNKNOWN_STATES:
            return value
    return None


def _text(value: Any) -> str | None:
    if value is None:
        return None
    result = str(value).strip()
    if not result or result.lower() in UNKNOWN_STATES:
        return None
    return result[:96]


def snapshot_from_state(
    state: State, supplemental: dict[str, Any] | None = None
) -> dict[str, Any]:
    """Build the versioned weather payload from one HA weather entity."""

    if state.state.lower() in UNKNOWN_STATES:
        raise HomeAssistantError(f"Weather entity {state.entity_id} is unavailable")

    attributes = state.attributes
    temperature = _number(attributes.get("temperature"))
    if temperature is None:
        raise HomeAssistantError(f"Weather entity {state.entity_id} has no temperature")

    payload: dict[str, Any] = {
        "source": "home_assistant",
        "condition": state.state,
        "temperatureC": round(
            _to_celsius(temperature, attributes.get("temperature_unit")), 1
        ),
        "observedAt": state.last_updated.isoformat(),
    }

    text_fields = {
        "weatherCode": ("weather_code", "weercode", "condition_code", "weathercode"),
        "description": ("description", "weather_description", "omschrijving", "condition_text"),
        "forecast": ("forecast", "weather_forecast", "weersverwachting", "forecast_text"),
        "warning": ("warning", "weather_warning", "waarschuwing"),
        "windDirection": ("wind_direction", "winddirection", "windrichting"),
        "sunState": ("sun_state", "sunstate", "zon"),
    }
    for target, names in text_fields.items():
        value = _text((supplemental or {}).get(target)) or _text(_attribute(attributes, *names))
        if value:
            payload[target] = value

    numeric_fields = {
        "rainTodayMm": ("rain_today", "rain_today_mm"),
        "rainTomorrowMm": ("rain_tomorrow", "rain_tomorrow_mm"),
        "globalRadiationWm2": ("global_radiation", "global_radiation_w_m2", "solar_radiation"),
        "precipitationTodayProbability": ("precipitation_today_probability", "precipitation_probability_today"),
        "precipitationTomorrowProbability": ("precipitation_tomorrow_probability", "precipitation_probability_tomorrow"),
    }
    for target, names in numeric_fields.items():
        value = _number((supplemental or {}).get(target))
        if value is None:
            value = _number(_attribute(attributes, *names))
        if value is not None:
            payload[target] = round(value, 1)

    optional_temperature = _number(attributes.get("apparent_temperature"))
    if optional_temperature is not None:
        payload["apparentTemperatureC"] = round(
            _to_celsius(optional_temperature, attributes.get("temperature_unit")), 1
        )

    for source, target in (
        ("humidity", "humidity"),
        ("precipitation_probability", "precipitationProbability"),
    ):
        value = _number(attributes.get(source))
        if value is not None:
            payload[target] = round(value, 1)

    wind_speed = _number(attributes.get("wind_speed"))
    if wind_speed is not None:
        payload["windSpeedKph"] = round(
            _to_kph(wind_speed, attributes.get("wind_speed_unit")), 1
        )

    return payload


async def async_send_weather_state(
    hass: HomeAssistant,
    runtime: dict[str, Any],
    entity_id: str,
    supplemental_entities: dict[str, str] | None = None,
    raise_errors: bool = False,
) -> None:
    """Push one configured weather entity to one display, logging soft failures."""

    state = hass.states.get(entity_id)
    if state is None:
        if raise_errors:
            raise HomeAssistantError(f"Weather entity {entity_id} does not exist")
        return
    try:
        supplemental = {
            field: sensor_state.state
            for field, sensor_entity_id in (supplemental_entities or {}).items()
            if (sensor_state := hass.states.get(sensor_entity_id)) is not None
        }
        await runtime["api"].async_send_weather(snapshot_from_state(state, supplemental))
    except (HomeAssistantError, SmartMatrixApiError) as err:
        if raise_errors:
            raise
        runtime["logger"].warning(
            "Unable to push weather from %s to %s: %s",
            entity_id,
            runtime["name"],
            err,
        )
