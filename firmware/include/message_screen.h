#pragma once

#include <Arduino.h>
#include "config_manager.h"
#include "display_manager.h"
#include "layout_renderer.h"
#include "time_manager.h"
#include "wifi_manager.h"
#include "weather_screen.h"

class MessageScreen {
public:
  MessageScreen(DisplayManager& display, ConfigManager& config, TimeManager& time, WifiManager& wifi, WeatherScreen& weather)
      : display_(display), config_(config), renderer_(display, time, wifi, weather) {}
  void begin();
  void update();
  void clear();
  bool showMessage(const String& json);
  bool showEvent(const String& json);
  bool active() const { return !activeJson_.isEmpty(); }

private:
  bool show(const String& json, bool event);
  void render();

  DisplayManager& display_;
  ConfigManager& config_;
  LayoutRenderer renderer_;
  String activeJson_;
  String activeLayoutId_;
  uint8_t activePriority_ = 0;
  uint32_t expiresAt_ = 0;
  uint32_t lastRenderAt_ = 0;
};
