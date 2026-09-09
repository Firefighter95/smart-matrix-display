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


def snapshot_from_state(state: State) -> dict[str, Any]:
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
    raise_errors: bool = False,
) -> None:
    """Push one configured weather entity to one display, logging soft failures."""

    state = hass.states.get(entity_id)
    if state is None:
        if raise_errors:
            raise HomeAssistantError(f"Weather entity {entity_id} does not exist")
        return
    try:
        await runtime["api"].async_send_weather(snapshot_from_state(state))
    except (HomeAssistantError, SmartMatrixApiError) as err:
        if raise_errors:
            raise
        runtime["logger"].warning(
            "Unable to push weather from %s to %s: %s",
            entity_id,
            runtime["name"],
            err,
        )
