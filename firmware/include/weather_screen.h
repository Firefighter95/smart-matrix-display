#pragma once

#include <Arduino.h>
#include "config_manager.h"
#include "display_manager.h"
#include "time_manager.h"

class WeatherScreen {
public:
  WeatherScreen(DisplayManager& display, TimeManager& time, ConfigManager& config)
      : display_(display), time_(time), config_(config) {}

  void begin();
  void update();
  bool setSnapshot(const String& json);
  bool hasSnapshot() const { return !snapshotJson_.isEmpty(); }
  const String& snapshotJson() const { return snapshotJson_; }

private:
  void render();
  uint16_t colorFromHex(const String& value, uint16_t fallback) const;
  DisplayManager& display_;
  TimeManager& time_;
  ConfigManager& config_;
  String snapshotJson_;
  uint32_t lastRenderAt_ = 0;
};
