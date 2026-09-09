"""Config flow for manually adding Smart Matrix Display devices by IP."""

from __future__ import annotations

import asyncio
from typing import Any

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import SmartMatrixApiClient, SmartMatrixApiError
from .const import CONF_HOST, CONF_NAME, CONF_PORT, CONF_TOKEN, DEFAULT_PORT, DOMAIN


def _schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    defaults = defaults or {}
    return vol.Schema(
        {
            vol.Required(CONF_HOST, default=defaults.get(CONF_HOST, "")): str,
            vol.Required(
                CONF_PORT, default=defaults.get(CONF_PORT, DEFAULT_PORT)
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=65535)),
            vol.Optional(CONF_TOKEN, default=defaults.get(CONF_TOKEN, "")): str,
            vol.Optional(CONF_NAME, default=defaults.get(CONF_NAME, "")): str,
        }
    )


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
            return self.async_create_entry(
                title=title,
                data={
                    CONF_HOST: user_input[CONF_HOST].strip(),
                    CONF_PORT: user_input[CONF_PORT],
                    CONF_TOKEN: user_input.get(CONF_TOKEN, ""),
                },
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
            self.hass.config_entries.async_update_entry(
                entry,
                data={
                    CONF_HOST: user_input[CONF_HOST].strip(),
                    CONF_PORT: user_input[CONF_PORT],
                    CONF_TOKEN: user_input.get(CONF_TOKEN, ""),
                },
            )
            await self.hass.config_entries.async_reload(entry.entry_id)
            return self.async_abort(reason="reconfigure_successful")

        return self.async_show_form(
            step_id="reconfigure",
            data_schema=_schema({**entry.data, CONF_NAME: entry.title}),
        )
