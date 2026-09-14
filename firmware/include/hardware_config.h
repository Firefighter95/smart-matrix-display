#pragma once

// Single source of truth for the physical HUB75 connection.
// These defaults follow the published Waveshare ESP32-S3 RGB Matrix example,
// but MUST be checked against the exact controller revision before production use.

#include <Arduino.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>

// The driver exposes legacy preprocessor defaults with these names. Undefine
// them after the driver header so our namespaced, authoritative values remain
// usable by the application without macro substitution.
#ifdef MATRIX_WIDTH
#undef MATRIX_WIDTH
#endif
#ifdef MATRIX_HEIGHT
#undef MATRIX_HEIGHT
#endif

namespace HardwareConfig {

enum class HardwareProfile : uint8_t { WAVESHARE_ESP32_S3_RGB_MATRIX, CUSTOM_HUB75 };
enum class ScanMode : uint8_t { ONE_THIRTY_SECOND_STANDARD, ONE_THIRTY_SECOND_NO_E_EXPERIMENTAL };
constexpr HardwareProfile PROFILE = HardwareProfile::WAVESHARE_ESP32_S3_RGB_MATRIX;
constexpr char PROFILE_NAME[] = "WAVESHARE_ESP32_S3_RGB_MATRIX";
constexpr char PANEL_PROFILE_NAME[] = "P2_5_128X64_1_32";
constexpr char PIN_MAPPING_STATUS[] = "OFFICIAL_WAVESHARE_ARDUINO_EXAMPLE_UNCONFIRMED_PANEL";

constexpr uint16_t MATRIX_WIDTH = 128;
constexpr uint16_t MATRIX_HEIGHT = 64;
constexpr uint8_t PANEL_CHAIN = 1;
constexpr uint8_t SCAN_ROWS = 32;
constexpr ScanMode SCAN_MODE = ScanMode::ONE_THIRTY_SECOND_STANDARD;
constexpr char SCAN_MODE_NAME[] = "1/32_STANDARD_WITH_E";
constexpr bool HAS_E_ADDRESS_LINE = SCAN_MODE == ScanMode::ONE_THIRTY_SECOND_STANDARD;
constexpr uint8_t VALIDATION_BRIGHTNESS = 15;
constexpr uint32_t VALIDATION_STATIC_STEP_MS = 1800;
constexpr uint32_t VALIDATION_ROW_STEP_MS = 100;
constexpr uint32_t VALIDATION_COLUMN_STEP_MS = 35;
constexpr uint16_t DISPLAY_ROTATION = 0;

// RGB data lines, upper and lower half of the HUB75 panel.
constexpr int8_t R1_PIN = 4;
constexpr int8_t G1_PIN = 5;
constexpr int8_t B1_PIN = 6;
constexpr int8_t R2_PIN = 7;
constexpr int8_t G2_PIN = 15;
constexpr int8_t B2_PIN = 16;

// Row address lines. A-E are required for a typical 1/32 scan panel.
constexpr int8_t A_PIN = 18;
constexpr int8_t B_PIN = 8;
constexpr int8_t C_PIN = 3;
constexpr int8_t D_PIN = 42;
constexpr int8_t E_PIN = 9;

// Control lines.
constexpr int8_t CLK_PIN = 41;
constexpr int8_t LAT_PIN = 40;
constexpr int8_t OE_PIN = 2;

// The panel listing does not expose the exact shift-driver IC. The default
// follows Waveshare's official example; the diagnostic environments can
// select FM6124, generic shift-register mode, or a faster clock.
#if defined(SMART_MATRIX_DIAGNOSTIC_FM6124)
constexpr HUB75_I2S_CFG::shift_driver SHIFT_DRIVER = HUB75_I2S_CFG::FM6124;
constexpr char SHIFT_DRIVER_NAME[] = "FM6124_DIAGNOSTIC";
#elif defined(SMART_MATRIX_DIAGNOSTIC_SHIFTREG)
constexpr HUB75_I2S_CFG::shift_driver SHIFT_DRIVER = HUB75_I2S_CFG::SHIFTREG;
constexpr char SHIFT_DRIVER_NAME[] = "SHIFTREG_NO_DRIVER_INIT_DIAGNOSTIC";
#else
constexpr HUB75_I2S_CFG::shift_driver SHIFT_DRIVER = HUB75_I2S_CFG::FM6126A;
constexpr char SHIFT_DRIVER_NAME[] = "FM6126A_DEFAULT";
#endif

#if defined(SMART_MATRIX_DIAGNOSTIC_20MHZ)
constexpr HUB75_I2S_CFG::clk_speed CLOCK_SPEED = HUB75_I2S_CFG::HZ_20M;
#else
constexpr HUB75_I2S_CFG::clk_speed CLOCK_SPEED = HUB75_I2S_CFG::HZ_10M;
#endif
constexpr bool DOUBLE_BUFFER = true;
constexpr bool CLOCK_PHASE = false;

inline HUB75_I2S_CFG::i2s_pins pinMap() {
  return {
    R1_PIN, G1_PIN, B1_PIN,
    R2_PIN, G2_PIN, B2_PIN,
    A_PIN, B_PIN, C_PIN, D_PIN, HAS_E_ADDRESS_LINE ? E_PIN : -1,
    LAT_PIN, OE_PIN, CLK_PIN,
  };
}

} // namespace HardwareConfig
