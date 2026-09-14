#pragma once

#include <Arduino.h>

class OtaManager {
public:
  void begin(const String& hostname);
  void update();
};
