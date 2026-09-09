#pragma once

#include <Arduino.h>

class SystemStatus {
public:
  String json(bool online, int32_t rssi, bool synced, bool displayEnabled, const String& mode) const;
};

