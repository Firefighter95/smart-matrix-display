"""Home Assistant integration for Smart Matrix Display devices."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Iterable
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import ATTR_DEVICE_ID
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import (
    ConfigEntryNotReady,
    HomeAssistantError,
    ServiceValidationError,
)
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import UpdateFailed

from .api import SmartMatrixApiClient
from .const import (
    ALIGNMENTS,
    ATTR_ALIGNMENT,
    ATTR_COLOR,
    ATTR_DURATION,
    ATTR_MESSAGE,
    ATTR_PRIORITY,
    ATTR_TITLE,
    CONF_HOST,
    CONF_PORT,
    CONF_TOKEN,
    DOMAIN,
    PLATFORMS,
    SERVICE_CLEAR_DISPLAY,
    SERVICE_RESTART,
    SERVICE_SEND_MESSAGE,
)
from .coordinator import SmartMatrixCoordinator

_LOGGER = logging.getLogger(__name__)

MESSAGE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_MESSAGE): cv.string,
        vol.Optional(ATTR_TITLE, default=""): cv.string,
        vol.Optional(ATTR_DURATION, default=20): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=86400)
        ),
        vol.Optional(ATTR_COLOR, default="#00FF00"): cv.string,
        vol.Optional(ATTR_ALIGNMENT, default="center"): vol.In(ALIGNMENTS),
        vol.Optional(ATTR_PRIORITY, default=50): vol.All(
            vol.Coerce(int), vol.Range(min=0, max=100)
        ),
    }
)


def _as_list(value: Any) -> list[str]:
    if value is None:
        return []
    return [value] if isinstance(value, str) else list(value)


def _target_runtimes(hass: HomeAssistant, call: ServiceCall) -> list[dict[str, Any]]:
    targets = call.target or {}
    target_device_ids = set(_as_list(targets.get(ATTR_DEVICE_ID)))
    if not target_device_ids:
        raise ServiceValidationError("Select at least one Smart Matrix Display device")

    registry = dr.async_get(hass)
    runtimes: list[dict[str, Any]] = []
    for runtime in hass.data.get(DOMAIN, {}).values():
        device = registry.async_get_device(identifiers={(DOMAIN, runtime["device_id"])})
        if device and device.id in target_device_ids:
            runtimes.append(runtime)
    if not runtimes:
        raise ServiceValidationError(
            "No configured Smart Matrix Display matched the target"
        )
    return runtimes


async def _call_all(
    runtimes: Iterable[dict[str, Any]], method: str, *args: Any
) -> None:
    results = await asyncio.gather(
        *(getattr(runtime["api"], method)(*args) for runtime in runtimes),
        return_exceptions=True,
    )
    errors = [result for result in results if isinstance(result, Exception)]
    if errors:
        raise HomeAssistantError(
            "One or more Smart Matrix Display devices could not be reached"
        ) from errors[0]


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Register integration services once."""

    if not hass.services.has_service(DOMAIN, SERVICE_SEND_MESSAGE):

        async def handle_send_message(call: ServiceCall) -> None:
            await _call_all(
                _target_runtimes(hass, call),
                "async_send_message",
                dict(call.data),
            )

        async def handle_clear_display(call: ServiceCall) -> None:
            await _call_all(_target_runtimes(hass, call), "async_clear_display")

        async def handle_restart(call: ServiceCall) -> None:
            await _call_all(_target_runtimes(hass, call), "async_restart")

        hass.services.async_register(
            DOMAIN,
            SERVICE_SEND_MESSAGE,
            handle_send_message,
            schema=MESSAGE_SCHEMA,
        )
        hass.services.async_register(
            DOMAIN, SERVICE_CLEAR_DISPLAY, handle_clear_display
        )
        hass.services.async_register(DOMAIN, SERVICE_RESTART, handle_restart)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up one display from a config entry."""

    api = SmartMatrixApiClient(
        async_get_clientsession(hass),
        entry.data[CONF_HOST],
        entry.data[CONF_PORT],
        entry.data.get(CONF_TOKEN),
    )
    coordinator = SmartMatrixCoordinator(hass, api, entry.title)
    try:
        await coordinator.async_config_entry_first_refresh()
    except UpdateFailed as err:
        raise ConfigEntryNotReady from err
    status = coordinator.data or {}
    device_id = str(status.get("device_id") or entry.unique_id or entry.entry_id)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "api": api,
        "coordinator": coordinator,
        "device_id": device_id,
        "name": entry.title,
    }
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload one display config entry."""

    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return unloaded
