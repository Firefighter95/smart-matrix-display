"""Speaker/media player entity for Home Assistant TTS and Assist audio."""

from __future__ import annotations

from typing import Any

from homeassistant.components import media_source
from homeassistant.components.media_player import (
    MediaPlayerDeviceClass,
    MediaPlayerEntity,
    MediaPlayerEntityFeature,
    MediaPlayerState,
    MediaType,
)
from homeassistant.components.media_player.browse_media import (
    BrowseMedia,
    async_process_play_media_url,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entity import SmartMatrixEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the speaker entity for one display."""

    runtime = hass.data[DOMAIN][entry.entry_id]
    async_add_entities(
        [
            SmartMatrixMediaPlayer(
                runtime["coordinator"],
                runtime["api"],
                runtime["device_id"],
                runtime["name"],
            )
        ]
    )


class SmartMatrixMediaPlayer(SmartMatrixEntity, MediaPlayerEntity):
    """Expose the onboard ES8311 speaker as a local HA media player."""

    _attr_device_class = MediaPlayerDeviceClass.SPEAKER
    _attr_supported_features = (
        MediaPlayerEntityFeature.PLAY_MEDIA
        | MediaPlayerEntityFeature.MEDIA_ANNOUNCE
        | MediaPlayerEntityFeature.STOP
        | MediaPlayerEntityFeature.VOLUME_SET
    )
    _attr_media_content_type = MediaType.MUSIC
    _attr_name = "Speaker"

    def __init__(self, coordinator, api, device_id: str, name: str) -> None:
        super().__init__(coordinator, device_id, name)
        self._api = api
        self._attr_unique_id = f"{device_id}_speaker"
        self._attr_translation_key = "speaker"

    @property
    def state(self) -> MediaPlayerState:
        """Return the current speaker state from the shared audio status."""

        audio = (self.coordinator.data or {}).get("audio") or {}
        if audio.get("state") == "RESPONDING":
            return MediaPlayerState.PLAYING
        return MediaPlayerState.IDLE

    @property
    def volume_level(self) -> float:
        """Return volume in Home Assistant's 0..1 range."""

        audio = (self.coordinator.data or {}).get("audio") or {}
        return float(audio.get("volume", 0)) / 100

    async def async_set_volume_level(self, volume: float) -> None:
        """Set the codec volume."""

        await self._api.async_set_volume(round(max(0, min(1, volume)) * 100))
        await self.coordinator.async_request_refresh()

    async def async_stop(self) -> None:
        """Stop current announcement playback."""

        await self._api.async_stop_audio_playback()
        await self.coordinator.async_request_refresh()

    async def async_play_media(
        self,
        media_type: str,
        media_id: str,
        enqueue: Any = None,
        announce: bool | None = None,
        **kwargs: Any,
    ) -> None:
        """Resolve HA media sources and stream them through the ESP32 speaker."""

        content_type = media_type or MediaType.MUSIC
        if media_source.is_media_source_id(media_id):
            item = await media_source.async_resolve_media(
                self.hass, media_id, self.entity_id
            )
            media_id = async_process_play_media_url(self.hass, item.url)
            content_type = item.mime_type

        if not media_id.startswith(("http://", "https://")):
            raise HomeAssistantError("Smart Matrix kan alleen HTTP(S)-audio afspelen")

        await self._api.async_play_audio_url(media_id, content_type)
        await self.coordinator.async_request_refresh()

    async def async_browse_media(
        self,
        media_content_type: str | None = None,
        media_content_id: str | None = None,
    ) -> BrowseMedia:
        """Expose Home Assistant's media browser, including TTS media sources."""

        return await media_source.async_browse_media(
            self.hass,
            media_content_id,
            content_filter=lambda item: item.media_content_type.startswith("audio/"),
        )
