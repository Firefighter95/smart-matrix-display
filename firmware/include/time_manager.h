#pragma once

#include <Arduino.h>

class TimeManager {
public:
  void begin();
  void update();
  bool synced() const { return synced_; }
  bool localTime(struct tm& result) const;

private:
  bool synced_ = false;
  uint32_t lastCheckAt_ = 0;
};
