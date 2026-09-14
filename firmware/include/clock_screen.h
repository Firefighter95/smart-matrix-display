#pragma once

#include <Arduino.h>
#include "config_manager.h"
#include "display_manager.h"
#include "time_manager.h"
#include "wifi_manager.h"

class ClockScreen {
public:
  ClockScreen(DisplayManager& display, TimeManager& time, WifiManager& wifi, ConfigManager& config)
      : display_(display), time_(time), wifi_(wifi), config_(config) {}
  void begin();
  void update();

private:
  void render();
  uint16_t colorFromHex(const String& value, uint16_t fallback) const;
  void dateText(const struct tm& local, char* buffer, size_t length) const;
  DisplayManager& display_;
  TimeManager& time_;
  WifiManager& wifi_;
  ConfigManager& config_;
  int lastSecond_ = -1;
};
