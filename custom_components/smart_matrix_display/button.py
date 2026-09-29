"""Action buttons for Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.button import ButtonEntity, ButtonEntityDescription
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class SmartMatrixButtonDescription(ButtonEntityDescription):
    """Description for a Smart Matrix action button."""

    method: str


BUTTONS = (
    SmartMatrixButtonDescription(
        key="clear_display",
        translation_key="clear_display",
        method="async_clear_display",
    ),
    SmartMatrixButtonDescription(key="restart", translation_key="restart", method="async_restart"),
    SmartMatrixButtonDescription(key="audio_test", translation_key="audio_test", method="async_audio_test"),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up action buttons for one display."""

    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        SmartMatrixButton(
            runtime["coordinator"], runtime["device_id"], runtime["name"], spec
        )
        for spec in BUTTONS
    )


class SmartMatrixButton(SmartMatrixEntity, ButtonEntity):
    """A button that calls one of the device API actions."""

    def __init__(
        self, coordinator, device_id: str, name: str, spec: SmartMatrixButtonDescription
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self._spec = spec
        self.entity_description = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"

    async def async_press(self) -> None:
        await getattr(self.coordinator.api, self._spec.method)()
