"""Action buttons for Smart Matrix Display devices."""

from __future__ import annotations

from dataclasses import dataclass

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


@dataclass(frozen=True, kw_only=True)
class _ButtonSpec:
    key: str
    translation_key: str
    method: str


BUTTONS = (
    _ButtonSpec(
        key="clear_display",
        translation_key="clear_display",
        method="async_clear_display",
    ),
    _ButtonSpec(key="restart", translation_key="restart", method="async_restart"),
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
        self, coordinator, device_id: str, name: str, spec: _ButtonSpec
    ) -> None:
        super().__init__(coordinator, device_id, name)
        self._spec = spec
        self._attr_unique_id = f"{device_id}_{spec.key}"
        self._attr_translation_key = spec.translation_key

    async def async_press(self) -> None:
        await getattr(self.coordinator.api, self._spec.method)()
