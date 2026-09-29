"""Regression tests for Home Assistant entity descriptions.

The integration deliberately keeps these tests importable without installing
Home Assistant locally.  They run automatically in an HA test environment and
are skipped on lightweight developer machines that do not have HA installed.
"""

import unittest

try:
    from homeassistant.components.binary_sensor import BinarySensorEntityDescription
    from homeassistant.components.button import ButtonEntityDescription
    from homeassistant.components.number import NumberEntityDescription
    from homeassistant.components.select import SelectEntityDescription
    from homeassistant.components.sensor import SensorEntityDescription
    from homeassistant.components.switch import SwitchEntityDescription

    from custom_components.smart_matrix_display.binary_sensor import BINARY_SENSORS
    from custom_components.smart_matrix_display.button import BUTTONS
    from custom_components.smart_matrix_display.number import (
        SmartMatrixBrightnessNumber,
    )
    from custom_components.smart_matrix_display.select import (
        SmartMatrixActiveLayout,
        SmartMatrixActiveProfile,
    )
    from custom_components.smart_matrix_display.sensor import SENSORS
    from custom_components.smart_matrix_display.switch import SmartMatrixPowerSwitch
except ModuleNotFoundError:
    HA_AVAILABLE = False
else:
    HA_AVAILABLE = True


@unittest.skipUnless(HA_AVAILABLE, "Home Assistant is not installed")
class EntityDescriptionCompatibilityTest(unittest.TestCase):
    """Ensure every platform passes an official description object to HA."""

    def test_sensor_descriptions_use_official_base_class(self) -> None:
        self.assertTrue(all(isinstance(item, SensorEntityDescription) for item in SENSORS))

    def test_binary_sensor_descriptions_use_official_base_class(self) -> None:
        self.assertTrue(
            all(isinstance(item, BinarySensorEntityDescription) for item in BINARY_SENSORS)
        )

    def test_button_descriptions_use_official_base_class(self) -> None:
        self.assertTrue(all(isinstance(item, ButtonEntityDescription) for item in BUTTONS))

    def test_control_entities_use_official_base_class(self) -> None:
        self.assertIsInstance(
            SmartMatrixBrightnessNumber.entity_description, NumberEntityDescription
        )
        self.assertIsInstance(SmartMatrixActiveLayout.entity_description, SelectEntityDescription)
        self.assertIsInstance(SmartMatrixActiveProfile.entity_description, SelectEntityDescription)
        self.assertIsInstance(SmartMatrixPowerSwitch.entity_description, SwitchEntityDescription)

    def test_existing_entity_keys_remain_stable(self) -> None:
        self.assertEqual(
            {item.key for item in SENSORS},
            {
                "mode",
                "active_layout",
                "profile",
                "wifi_rssi",
                "uptime",
                "firmware",
                "resolution",
                "queue_length",
                "heap_free",
                "psram_free",
                "hardware_profile",
                "panel_profile",
                "scan_rows",
                "pin_mapping",
                "ip",
                "hostname",
                "weather_condition",
                "weather_code",
                "weather_description",
                "weather_forecast",
                "weather_warning",
                "weather_temperature",
                "weather_wind",
                "weather_rain_today",
                "weather_rain_tomorrow",
                "weather_radiation",
                "weather_wind_direction",
                "weather_sun_state",
                "audio_state",
                "audio_input_level",
                "audio_microphones",
                "audio_wake_word_engine",
                "brightness",
            },
        )
        self.assertEqual(
            {item.key for item in BINARY_SENSORS},
            {"online", "time_synced", "display_enabled", "audio_available", "speaker_connected"},
        )


if __name__ == "__main__":
    unittest.main()
