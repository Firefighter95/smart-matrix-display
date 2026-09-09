"""Shared entity helpers for Smart Matrix Display."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN
from .coordinator import SmartMatrixCoordinator


class SmartMatrixEntity(CoordinatorEntity[SmartMatrixCoordinator]):
    """Base entity attached to one Smart Matrix Display config entry."""

    _attr_has_entity_name = True

    def __init__(
        self, coordinator: SmartMatrixCoordinator, device_id: str, name: str
    ) -> None:
        super().__init__(coordinator)
        self._device_id = device_id
        self._device_name = name

    @property
    def device_info(self) -> DeviceInfo:
        status = self.coordinator.data or {}
        return DeviceInfo(
            identifiers={(DOMAIN, self._device_id)},
            name=self._device_name,
            manufacturer="Smart Matrix Display",
            model="ESP32-S3 HUB75 controller",
            sw_version=status.get("firmware"),
            configuration_url=self.coordinator.api.base_url,
        )
