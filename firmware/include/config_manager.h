#pragma once

#include <Arduino.h>
#include <Preferences.h>

class ConfigManager {
public:
  static constexpr uint8_t CURRENT_SCHEMA_VERSION = 1;

  void begin();
  String json() const;
  bool saveJson(const String& json);
  bool reset();

private:
  Preferences preferences_;
  String configJson_;
};

