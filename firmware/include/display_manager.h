#pragma once

#include <Arduino.h>
#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>
#include "hardware_config.h"

enum class DisplayMode : uint8_t { BOOT, TEST, CLOCK, MESSAGE, WEATHER, OFF };

class DisplayManager {
public:
  bool begin();
  void update();
  bool ready() const { return panel_ != nullptr; }
  DisplayMode mode() const { return mode_; }
  String modeName() const;
  void setMode(DisplayMode mode);
  void setBrightness(uint8_t percentage);

private:
  MatrixPanel_I2S_DMA* panel_ = nullptr;
  DisplayMode mode_ = DisplayMode::BOOT;
  uint8_t brightness_ = 25;
  uint8_t testIndex_ = 0;
  uint32_t lastPatternAt_ = 0;
  uint32_t lastFrameAt_ = 0;
  int movingX_ = 0;

  void renderTestPattern(uint8_t index);
  void renderMovingBlock();
  uint16_t color(uint8_t red, uint8_t green, uint8_t blue) const;
};
