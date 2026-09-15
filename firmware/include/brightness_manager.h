#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config_manager.h"
#include "display_manager.h"
#include "time_manager.h"

class BrightnessManager {
public:
  void begin(DisplayManager& display, ConfigManager& config, TimeManager& time);
  void update();
  uint8_t current() const { return current_; }

private:
  DisplayManager* display_ = nullptr;
  ConfigManager* config_ = nullptr;
  TimeManager* time_ = nullptr;
  uint8_t current_ = 25;
  uint32_t lastApplyAt_ = 0;

  uint8_t scheduledBrightness(const JsonDocument& document, const struct tm& local) const;
};
