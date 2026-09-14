#include "raw_signal_test.h"

#include <Arduino.h>
#include <driver/gpio.h>

#include "hardware_config.h"

namespace {
enum class ProbeColor : uint8_t { RED, GREEN, BLUE, WHITE };

constexpr uint32_t COLOR_HOLD_MS = 3000;
constexpr uint32_t ROW_ON_TIME_US = 500;
constexpr uint16_t SHIFT_CLOCKS = HardwareConfig::MATRIX_WIDTH;

ProbeColor currentColor = ProbeColor::RED;
uint32_t colorStartedAt = 0;

const char* colorName(ProbeColor color) {
  switch (color) {
    case ProbeColor::RED: return "RED";
    case ProbeColor::GREEN: return "GREEN";
    case ProbeColor::BLUE: return "BLUE";
    case ProbeColor::WHITE: return "WHITE";
    default: return "UNKNOWN";
  }
}

void level(int8_t pin, bool high) {
  gpio_set_level(static_cast<gpio_num_t>(pin), high ? 1 : 0);
}

void pulseClock() {
  level(HardwareConfig::CLK_PIN, true);
  level(HardwareConfig::CLK_PIN, false);
}

void setAddress(uint8_t row) {
  level(HardwareConfig::A_PIN, (row & 0x01) != 0);
  level(HardwareConfig::B_PIN, (row & 0x02) != 0);
  level(HardwareConfig::C_PIN, (row & 0x04) != 0);
  level(HardwareConfig::D_PIN, (row & 0x08) != 0);
  level(HardwareConfig::E_PIN, (row & 0x10) != 0);
}

void setData(ProbeColor color, bool on) {
  const bool red = on && (color == ProbeColor::RED || color == ProbeColor::WHITE);
  const bool green = on && (color == ProbeColor::GREEN || color == ProbeColor::WHITE);
  const bool blue = on && (color == ProbeColor::BLUE || color == ProbeColor::WHITE);
  level(HardwareConfig::R1_PIN, red);
  level(HardwareConfig::R2_PIN, red);
  level(HardwareConfig::G1_PIN, green);
  level(HardwareConfig::G2_PIN, green);
  level(HardwareConfig::B1_PIN, blue);
  level(HardwareConfig::B2_PIN, blue);
}

void configureOutput(int8_t pin) {
  gpio_reset_pin(static_cast<gpio_num_t>(pin));
  gpio_set_direction(static_cast<gpio_num_t>(pin), GPIO_MODE_OUTPUT);
  level(pin, false);
}

void initializePins() {
  configureOutput(HardwareConfig::R1_PIN);
  configureOutput(HardwareConfig::G1_PIN);
  configureOutput(HardwareConfig::B1_PIN);
  configureOutput(HardwareConfig::R2_PIN);
  configureOutput(HardwareConfig::G2_PIN);
  configureOutput(HardwareConfig::B2_PIN);
  configureOutput(HardwareConfig::A_PIN);
  configureOutput(HardwareConfig::B_PIN);
  configureOutput(HardwareConfig::C_PIN);
  configureOutput(HardwareConfig::D_PIN);
  configureOutput(HardwareConfig::E_PIN);
  configureOutput(HardwareConfig::CLK_PIN);
  configureOutput(HardwareConfig::LAT_PIN);
  configureOutput(HardwareConfig::OE_PIN);
  level(HardwareConfig::OE_PIN, true); // HUB75 OE is active low.
}

void initializeFm6124Family() {
  // Match the library's FM6124/FM6126A register preamble, but send it through
  // the raw GPIO path so DMA setup and the browser mock are not involved.
  const bool reg1[16] = {false, false, false, false, false, true, true, true,
                         true, true, true, false, false, false, false, false};
  const bool reg2[16] = {false, false, false, false, false, false, false, false,
                         false, true, false, false, false, false, false, false};

  level(HardwareConfig::OE_PIN, true);
  for (uint16_t clock = 0; clock < SHIFT_CLOCKS; ++clock) {
    setData(ProbeColor::WHITE, reg1[clock % 16]);
    if (clock > SHIFT_CLOCKS - 12) level(HardwareConfig::LAT_PIN, true);
    pulseClock();
  }
  level(HardwareConfig::LAT_PIN, false);

  for (uint16_t clock = 0; clock < SHIFT_CLOCKS; ++clock) {
    setData(ProbeColor::WHITE, reg2[clock % 16]);
    if (clock > SHIFT_CLOCKS - 13) level(HardwareConfig::LAT_PIN, true);
    pulseClock();
  }
  level(HardwareConfig::LAT_PIN, false);
  setData(ProbeColor::WHITE, false);
  for (uint16_t clock = 0; clock < SHIFT_CLOCKS; ++clock) pulseClock();
  level(HardwareConfig::LAT_PIN, true);
  pulseClock();
  level(HardwareConfig::LAT_PIN, false);
  level(HardwareConfig::OE_PIN, false);
}

void refreshOneFrame(ProbeColor color) {
  for (uint8_t row = 0; row < HardwareConfig::SCAN_ROWS; ++row) {
    level(HardwareConfig::OE_PIN, true);
    setAddress(row);
    for (uint16_t column = 0; column < HardwareConfig::MATRIX_WIDTH; ++column) {
      setData(color, true);
      pulseClock();
    }
    level(HardwareConfig::LAT_PIN, true);
    pulseClock();
    level(HardwareConfig::LAT_PIN, false);
    level(HardwareConfig::OE_PIN, false);
    delayMicroseconds(ROW_ON_TIME_US);
  }
  level(HardwareConfig::OE_PIN, true);
}

void announceColor() {
  Serial.printf("[RAW TEST] %s | direct GPIO | OE active-low | rows=%u width=%u\n",
                colorName(currentColor), HardwareConfig::SCAN_ROWS, HardwareConfig::MATRIX_WIDTH);
}
} // namespace

void rawSignalTestSetup() {
  Serial.println("Smart Matrix Raw HUB75 Signal Probe");
  Serial.println("DMA: bypassed");
  Serial.println("Mock display: bypassed");
  Serial.printf("Resolution: %ux%u, scan: 1/%u\n", HardwareConfig::MATRIX_WIDTH,
                HardwareConfig::MATRIX_HEIGHT, HardwareConfig::SCAN_ROWS);
  Serial.printf("GPIO: R1=%d G1=%d B1=%d R2=%d G2=%d B2=%d A=%d B=%d C=%d D=%d E=%d LAT=%d OE=%d CLK=%d\n",
                HardwareConfig::R1_PIN, HardwareConfig::G1_PIN, HardwareConfig::B1_PIN,
                HardwareConfig::R2_PIN, HardwareConfig::G2_PIN, HardwareConfig::B2_PIN,
                HardwareConfig::A_PIN, HardwareConfig::B_PIN, HardwareConfig::C_PIN,
                HardwareConfig::D_PIN, HardwareConfig::E_PIN, HardwareConfig::LAT_PIN,
                HardwareConfig::OE_PIN, HardwareConfig::CLK_PIN);
  initializePins();
  initializeFm6124Family();
  colorStartedAt = millis();
  announceColor();
}

void rawSignalTestLoop() {
  refreshOneFrame(currentColor);
  if (millis() - colorStartedAt < COLOR_HOLD_MS) return;
  currentColor = static_cast<ProbeColor>((static_cast<uint8_t>(currentColor) + 1) % 4);
  colorStartedAt = millis();
  announceColor();
}
