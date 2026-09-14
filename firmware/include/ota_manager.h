#pragma once

#include <Arduino.h>

class OtaManager {
public:
  void begin(const String& hostname);
  void update();

private:
  String hostname_ = "smartmatrix";
  bool started_ = false;
};
