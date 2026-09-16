"""Config flow for manually adding Smart Matrix Display devices by IP."""

from __future__ import annotations

import asyncio
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import SmartMatrixApiClient, SmartMatrixApiError
from .const import (
    CONF_HOST,
    CONF_NAME,
    CONF_PORT,
    CONF_TOKEN,
    CONF_WEATHER_CODE_ENTITY,
    CONF_WEATHER_DESCRIPTION_ENTITY,
    CONF_WEATHER_ENTITY,
    CONF_WEATHER_FORECAST_ENTITY,
    CONF_WEATHER_RADIATION_ENTITY,
    CONF_WEATHER_RAIN_TODAY_ENTITY,
    CONF_WEATHER_RAIN_TOMORROW_ENTITY,
    CONF_WEATHER_SUN_STATE_ENTITY,
    CONF_WEATHER_WARNING_ENTITY,
    CONF_WEATHER_WIND_DIRECTION_ENTITY,
    DEFAULT_PORT,
    DOMAIN,
)


def _schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    defaults = defaults or {}
    weather_field = vol.Optional(CONF_WEATHER_ENTITY)
    if CONF_WEATHER_ENTITY in defaults:
        weather_field = vol.Optional(
            CONF_WEATHER_ENTITY, default=defaults[CONF_WEATHER_ENTITY]
        )
    fields: dict[Any, Any] = {
        vol.Required(CONF_HOST, default=defaults.get(CONF_HOST, "")): str,
        vol.Required(
            CONF_PORT, default=defaults.get(CONF_PORT, DEFAULT_PORT)
        ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
        vol.Optional(CONF_TOKEN, default=defaults.get(CONF_TOKEN, "")): str,
        vol.Optional(CONF_NAME, default=defaults.get(CONF_NAME, "")): str,
        weather_field: selector.EntitySelector(
            selector.EntitySelectorConfig(domain="weather")
        ),
    }
    for key in (
        CONF_WEATHER_CODE_ENTITY,
        CONF_WEATHER_DESCRIPTION_ENTITY,
        CONF_WEATHER_FORECAST_ENTITY,
        CONF_WEATHER_WARNING_ENTITY,
        CONF_WEATHER_RAIN_TODAY_ENTITY,
        CONF_WEATHER_RAIN_TOMORROW_ENTITY,
        CONF_WEATHER_RADIATION_ENTITY,
        CONF_WEATHER_WIND_DIRECTION_ENTITY,
        CONF_WEATHER_SUN_STATE_ENTITY,
    ):
        field = vol.Optional(key, default=defaults[key]) if defaults.get(key) else vol.Optional(key)
        fields[field] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain="sensor")
        )
    return vol.Schema(fields)


def _entry_data(user_input: dict[str, Any]) -> dict[str, Any]:
    data = {
        CONF_HOST: user_input[CONF_HOST].strip(),
        CONF_PORT: user_input[CONF_PORT],
        CONF_TOKEN: user_input.get(CONF_TOKEN, ""),
    }
    for key in (
        CONF_WEATHER_ENTITY,
        CONF_WEATHER_CODE_ENTITY,
        CONF_WEATHER_DESCRIPTION_ENTITY,
        CONF_WEATHER_FORECAST_ENTITY,
        CONF_WEATHER_WARNING_ENTITY,
        CONF_WEATHER_RAIN_TODAY_ENTITY,
        CONF_WEATHER_RAIN_TOMORROW_ENTITY,
        CONF_WEATHER_RADIATION_ENTITY,
        CONF_WEATHER_WIND_DIRECTION_ENTITY,
        CONF_WEATHER_SUN_STATE_ENTITY,
    ):
        if user_input.get(key):
            data[key] = user_input[key]
    return data


async def _test_device(hass: HomeAssistant, data: dict[str, Any]) -> dict[str, Any]:
    api = SmartMatrixApiClient(
        async_get_clientsession(hass),
        data[CONF_HOST],
        data[CONF_PORT],
        data.get(CONF_TOKEN),
    )
    return await api.async_get_status()


class SmartMatrixConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle adding and reconfiguring one display at a time."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        if user_input is not None:
            try:
                status = await _test_device(self.hass, user_input)
            except (SmartMatrixApiError, asyncio.TimeoutError):
                return self.async_show_form(
                    step_id="user",
                    data_schema=_schema(user_input),
                    errors={"base": "cannot_connect"},
                )

            device_id = str(
                status.get("device_id")
                or f"host:{user_input[CONF_HOST].strip().lower()}"
            )
            await self.async_set_unique_id(device_id)
            self._abort_if_unique_id_configured(
                updates={
                    CONF_HOST: user_input[CONF_HOST].strip(),
                    CONF_PORT: user_input[CONF_PORT],
                    CONF_TOKEN: user_input.get(CONF_TOKEN, ""),
                }
            )
            title = (
                user_input.get(CONF_NAME)
                or status.get("hostname")
                or f"Smart Matrix {user_input[CONF_HOST].strip()}"
            )
            entry_data = _entry_data(user_input)
            return self.async_create_entry(
                title=title,
                data=entry_data,
            )

        return self.async_show_form(step_id="user", data_schema=_schema())

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """Allow an IP address, port, or token to be changed later."""

        entry = self.hass.config_entries.async_get_entry(self.context["entry_id"])
        if entry is None:
            return self.async_abort(reason="cannot_connect")
        if user_input is not None:
            try:
                await _test_device(self.hass, user_input)
            except (SmartMatrixApiError, asyncio.TimeoutError):
                return self.async_show_form(
                    step_id="reconfigure",
                    data_schema=_schema(user_input),
                    errors={"base": "cannot_connect"},
                )
            entry_data = _entry_data(user_input)
            self.hass.config_entries.async_update_entry(entry, data=entry_data)
            await self.hass.config_entries.async_reload(entry.entry_id)
            return self.async_abort(reason="reconfigure_successful")

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=_schema({**entry.data, CONF_NAME: entry.title}),
        )
