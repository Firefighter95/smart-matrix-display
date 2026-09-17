#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include "config_manager.h"
#include "display_manager.h"
#include "time_manager.h"
#include "wifi_manager.h"
#include "weather_screen.h"

class LayoutRenderer {
public:
  LayoutRenderer(DisplayManager& display, TimeManager& time, WifiManager& wifi, WeatherScreen& weather)
      : display_(display), time_(time), wifi_(wifi), weather_(weather) {}

  void render(JsonObjectConst layout, JsonObjectConst payload, JsonObjectConst clockConfig, uint16_t background);
  bool hasHorizontalScroll(JsonObjectConst layout) const;

private:
  struct ScrollState {
    String elementId;
    size_t offset = 0;
    uint32_t lastStepAtMs = 0;
  };

  String valueAt(JsonObjectConst object, const String& path) const;
  String replaceVariables(String text, JsonObjectConst payload, JsonObjectConst clockConfig) const;
  String elementValue(JsonObjectConst element, JsonObjectConst payload, JsonObjectConst clockConfig) const;
  size_t scrollOffset(const String& elementId, size_t streamLength);
  uint16_t colorFromHex(const String& value, uint16_t fallback) const;
  uint16_t statusColor() const;
  String timeText(JsonObjectConst clockConfig) const;
  String dateText() const;
  void drawText(const String& text, int16_t x, int16_t y, int16_t width, int16_t height,
                uint8_t scale, const String& color, const String& align);

  DisplayManager& display_;
  TimeManager& time_;
  WifiManager& wifi_;
  WeatherScreen& weather_;
  ScrollState scrollStates_[4];
};
