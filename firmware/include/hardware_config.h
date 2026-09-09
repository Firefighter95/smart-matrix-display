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

constexpr uint16_t MATRIX_WIDTH = 128;
constexpr uint16_t MATRIX_HEIGHT = 64;
constexpr uint8_t PANEL_CHAIN = 1;
constexpr uint8_t SCAN_ROWS = 32;
constexpr bool HAS_E_ADDRESS_LINE = true;

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

// Change this if the panel has a known shift-driver IC that needs initialization.
constexpr HUB75_I2S_CFG::shift_driver SHIFT_DRIVER = HUB75_I2S_CFG::SHIFTREG;
constexpr HUB75_I2S_CFG::clk_speed CLOCK_SPEED = HUB75_I2S_CFG::HZ_10M;
constexpr bool DOUBLE_BUFFER = true;
constexpr bool CLOCK_PHASE = true;

inline HUB75_I2S_CFG::i2s_pins pinMap() {
  return {
    R1_PIN, G1_PIN, B1_PIN,
    R2_PIN, G2_PIN, B2_PIN,
    A_PIN, B_PIN, C_PIN, D_PIN, E_PIN,
    LAT_PIN, OE_PIN, CLK_PIN,
  };
}

} // namespace HardwareConfig
