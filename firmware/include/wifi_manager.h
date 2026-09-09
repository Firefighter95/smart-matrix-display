#pragma once

#include <Arduino.h>

class WifiManager {
public:
  void begin();
  void update();
  bool connected() const;
  int32_t rssi() const;
  String ip() const;
  const String& hostname() const { return hostname_; }

private:
  String hostname_ = "smartmatrix";
  uint32_t retryAt_ = 0;
};

