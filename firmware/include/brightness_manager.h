#pragma once

#include <Arduino.h>

class BrightnessManager {
public:
  void begin();
  void update();
  uint8_t current() const { return current_; }

private:
  uint8_t current_ = 25;
};

