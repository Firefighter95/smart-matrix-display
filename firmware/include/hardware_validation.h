#pragma once

#include <Arduino.h>
#include "display_output.h"

class HardwareValidation {
public:
  bool begin(IDisplayOutput* output);
  void update();
  bool failed() const { return failed_; }

private:
  enum class Test : uint8_t {
    BLACK,
    RED,
    GREEN,
    BLUE,
    WHITE,
    HORIZONTAL_LINES,
    VERTICAL_LINES,
    CHECKERBOARD,
    ROW_TEST,
    COLUMN_TEST,
    COLOR_BARS,
    TEXT_TEST,
    MOVING_PIXEL,
    MOVING_BLOCK,
  };

  IDisplayOutput* output_ = nullptr;
  Test test_ = Test::BLACK;
  uint8_t testNumber_ = 0;
  uint16_t step_ = 0;
  uint32_t lastStepAt_ = 0;
  bool failed_ = false;
  int16_t movingPixel_ = 0;
  int16_t movingBlockX_ = 0;
  int16_t movingBlockY_ = 0;
  int8_t movingBlockDx_ = 1;
  int8_t movingBlockDy_ = 1;

  void printDiagnostics() const;
  void startTest(Test test, uint8_t number);
  void renderStaticTest();
  void renderRowTest();
  void renderColumnTest();
  void renderMovingPixel();
  void renderMovingBlock();
  void drawPixel(int16_t x, int16_t y, uint16_t color);
  uint16_t color(uint8_t red, uint8_t green, uint8_t blue) const;
  static const char* testName(Test test);
};
