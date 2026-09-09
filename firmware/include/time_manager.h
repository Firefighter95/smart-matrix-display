#pragma once

#include <Arduino.h>

class TimeManager {
public:
  void begin();
  void update();
  bool synced() const { return synced_; }

private:
  bool synced_ = false;
};

