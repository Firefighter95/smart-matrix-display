#pragma once

#include <Arduino.h>
#include "hardware_config.h"

class SystemStatus {
public:
  String json(bool online, int32_t rssi, bool synced, bool displayEnabled, const String& mode, const String& ip, const String& hostname, uint8_t brightness) const;
};
