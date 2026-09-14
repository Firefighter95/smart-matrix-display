#include "hardware_validation.h"

#include "hardware_config.h"

namespace {
constexpr uint8_t TEST_COUNT = 14;
constexpr int16_t WIDTH = HardwareConfig::MATRIX_WIDTH;
constexpr int16_t HEIGHT = HardwareConfig::MATRIX_HEIGHT;
}

const char* HardwareValidation::testName(Test test) {
  switch (test) {
    case Test::BLACK: return "BLACK";
    case Test::RED: return "RED";
    case Test::GREEN: return "GREEN";
    case Test::BLUE: return "BLUE";
    case Test::WHITE: return "WHITE";
    case Test::HORIZONTAL_LINES: return "HORIZONTAL LINES";
    case Test::VERTICAL_LINES: return "VERTICAL LINES";
    case Test::CHECKERBOARD: return "CHECKERBOARD";
    case Test::ROW_TEST: return "ROW TEST";
    case Test::COLUMN_TEST: return "COLUMN TEST";
    case Test::COLOR_BARS: return "COLOR BARS";
    case Test::TEXT_TEST: return "TEXT TEST";
    case Test::MOVING_PIXEL: return "MOVING PIXEL";
    case Test::MOVING_BLOCK: return "MOVING BLOCK";
    default: return "UNKNOWN";
  }
}

uint16_t HardwareValidation::color(uint8_t red, uint8_t green, uint8_t blue) const {
  return output_ ? output_->color565(red, green, blue) : 0;
}

void HardwareValidation::drawPixel(int16_t x, int16_t y, uint16_t pixelColor) {
  if (!output_ || x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  if (HardwareConfig::DISPLAY_ROTATION == 180) output_->drawPixel(WIDTH - 1 - x, HEIGHT - 1 - y, pixelColor);
  else output_->drawPixel(x, y, pixelColor);
}

void HardwareValidation::printDiagnostics() const {
  Serial.println("Smart Matrix Hardware Validation");
  Serial.println("Firmware: 1.4.0-hwtest");
  Serial.println("Board: Waveshare ESP32-S3-RGB-Matrix");
  Serial.println("MCU: ESP32-S3-WROOM-2 / ESP32-S3-N32R16");
  Serial.println("Panel: AGSP2.5-260706-5000");
  Serial.println("Resolution: 128x64");
  Serial.println("Advertised scan: 1/32");
  Serial.printf("Driver: %s\n", HardwareConfig::SHIFT_DRIVER_NAME);
  Serial.printf("Brightness: %u%%\n", HardwareConfig::VALIDATION_BRIGHTNESS);
  Serial.printf("Pin profile: %s\n", HardwareConfig::PIN_MAPPING_STATUS);
  Serial.printf("Scan mode: %s\n", HardwareConfig::SCAN_MODE_NAME);
  Serial.println("RGB order: R1,G1,B1 / R2,G2,B2");
  Serial.printf("PSRAM detected: %s\n", psramFound() ? "yes" : "no");
  Serial.printf("PSRAM size: %u bytes\n", ESP.getPsramSize());
  Serial.printf("Flash size: %u bytes\n", ESP.getFlashChipSize());
  Serial.printf("Free heap: %u bytes\n", ESP.getFreeHeap());
  Serial.printf("Panel config: %ux%u, chain=%u, E=%s, rotation=%u\n", WIDTH, HEIGHT, HardwareConfig::PANEL_CHAIN, HardwareConfig::HAS_E_ADDRESS_LINE ? "yes" : "no", HardwareConfig::DISPLAY_ROTATION);
  Serial.printf("GPIO: R1=%d G1=%d B1=%d R2=%d G2=%d B2=%d A=%d B=%d C=%d D=%d E=%d LAT=%d OE=%d CLK=%d\n", HardwareConfig::R1_PIN, HardwareConfig::G1_PIN, HardwareConfig::B1_PIN, HardwareConfig::R2_PIN, HardwareConfig::G2_PIN, HardwareConfig::B2_PIN, HardwareConfig::A_PIN, HardwareConfig::B_PIN, HardwareConfig::C_PIN, HardwareConfig::D_PIN, HardwareConfig::E_PIN, HardwareConfig::LAT_PIN, HardwareConfig::OE_PIN, HardwareConfig::CLK_PIN);
  Serial.println();
}

bool HardwareValidation::begin(IDisplayOutput* output) {
  output_ = output;
  if (!output_) {
    failed_ = true;
    Serial.println("[ERROR] HUB75 initialization failed; validation stopped safely.");
    return false;
  }
  output_->setBrightness(HardwareConfig::VALIDATION_BRIGHTNESS);
  printDiagnostics();
  startTest(Test::BLACK, 1);
  return true;
}

void HardwareValidation::startTest(Test test, uint8_t number) {
  test_ = test;
  testNumber_ = number;
  step_ = 0;
  movingPixel_ = 0;
  movingBlockX_ = 0;
  movingBlockY_ = 0;
  movingBlockDx_ = 1;
  movingBlockDy_ = 1;
  lastStepAt_ = millis();
  Serial.printf("[TEST %02u] %s\n", testNumber_, testName(test_));
  if (test_ == Test::ROW_TEST) Serial.println("[ROW] 0");
  if (test_ == Test::COLUMN_TEST) Serial.println("[COLUMN] 0");
  if (test_ == Test::ROW_TEST || test_ == Test::COLUMN_TEST) {
    if (test_ == Test::ROW_TEST) renderRowTest();
    else renderColumnTest();
  } else if (test_ == Test::MOVING_PIXEL) renderMovingPixel();
  else if (test_ == Test::MOVING_BLOCK) renderMovingBlock();
  else renderStaticTest();
}

void HardwareValidation::renderStaticTest() {
  if (!output_) return;
  output_->clearScreen();
  const uint16_t white = color(255, 255, 255);
  switch (test_) {
    case Test::BLACK: break;
    case Test::RED: output_->fillScreen(color(255, 0, 0)); break;
    case Test::GREEN: output_->fillScreen(color(0, 255, 0)); break;
    case Test::BLUE: output_->fillScreen(color(0, 0, 255)); break;
    case Test::WHITE: output_->fillScreen(white); break;
    case Test::HORIZONTAL_LINES:
      for (int16_t y = 0; y < HEIGHT; ++y) for (int16_t x = 0; x < WIDTH; ++x) drawPixel(x, y, (y % 2) ? color(0, 255, 0) : color(255, 0, 0));
      break;
    case Test::VERTICAL_LINES:
      for (int16_t x = 0; x < WIDTH; ++x) for (int16_t y = 0; y < HEIGHT; ++y) drawPixel(x, y, (x % 2) ? color(0, 0, 255) : color(255, 255, 255));
      break;
    case Test::CHECKERBOARD:
      for (int16_t y = 0; y < HEIGHT; ++y) for (int16_t x = 0; x < WIDTH; ++x) if ((x + y) % 2 == 0) drawPixel(x, y, white);
      break;
    case Test::COLOR_BARS: {
      const uint16_t bars[] = {color(255, 0, 0), color(0, 255, 0), color(0, 0, 255), color(0, 255, 255), color(255, 0, 255), color(255, 255, 0), white};
      for (uint8_t bar = 0; bar < 7; ++bar) for (int16_t x = (WIDTH * bar) / 7; x < (WIDTH * (bar + 1)) / 7; ++x) for (int16_t y = 0; y < HEIGHT; ++y) drawPixel(x, y, bars[bar]);
      break;
    }
    case Test::TEXT_TEST:
      output_->setTextSize(1);
      output_->setTextColor(color(0, 255, 0));
      output_->setCursor(2, 4);
      output_->print("SMART MATRIX");
      output_->setTextColor(color(255, 255, 255));
      output_->setCursor(2, 22);
      output_->print("128 x 64");
      output_->setTextColor(color(0, 180, 255));
      output_->setCursor(2, 40);
      output_->print("0123456789");
      break;
    default: break;
  }
}

void HardwareValidation::renderRowTest() {
  output_->clearScreen();
  const int16_t row = static_cast<int16_t>(step_ % HEIGHT);
  for (int16_t x = 0; x < WIDTH; ++x) drawPixel(x, row, color(255, 255, 255));
}

void HardwareValidation::renderColumnTest() {
  output_->clearScreen();
  const int16_t column = static_cast<int16_t>(step_ % WIDTH);
  for (int16_t y = 0; y < HEIGHT; ++y) drawPixel(column, y, color(255, 255, 255));
}

void HardwareValidation::renderMovingPixel() {
  output_->clearScreen();
  const int16_t perimeter = 2 * (WIDTH + HEIGHT) - 4;
  int16_t position = movingPixel_ % perimeter;
  int16_t x = 0;
  int16_t y = 0;
  if (position < WIDTH) x = position;
  else if ((position -= WIDTH) < HEIGHT - 1) { x = WIDTH - 1; y = position + 1; }
  else if ((position -= HEIGHT - 1) < WIDTH - 1) { x = WIDTH - position - 2; y = HEIGHT - 1; }
  else { position -= WIDTH - 1; x = 0; y = HEIGHT - position - 2; }
  drawPixel(x, y, color(255, 120, 0));
}

void HardwareValidation::renderMovingBlock() {
  output_->clearScreen();
  for (int16_t y = 0; y < 4; ++y) for (int16_t x = 0; x < 4; ++x) drawPixel(movingBlockX_ + x, movingBlockY_ + y, color(255, 120, 0));
}

void HardwareValidation::update() {
  if (failed_ || !output_) return;
  const uint32_t now = millis();
  const uint32_t stepDelay = test_ == Test::ROW_TEST ? HardwareConfig::VALIDATION_ROW_STEP_MS : test_ == Test::COLUMN_TEST ? HardwareConfig::VALIDATION_COLUMN_STEP_MS : test_ == Test::MOVING_PIXEL || test_ == Test::MOVING_BLOCK ? 60 : HardwareConfig::VALIDATION_STATIC_STEP_MS;
  if (now - lastStepAt_ < stepDelay) return;
  lastStepAt_ = now;

  if (test_ == Test::ROW_TEST) {
    ++step_;
    if (step_ >= HEIGHT) { startTest(Test::COLUMN_TEST, 10); return; }
    Serial.printf("[ROW] %u\n", step_);
    renderRowTest();
    return;
  }
  if (test_ == Test::COLUMN_TEST) {
    ++step_;
    if (step_ >= WIDTH) { startTest(Test::COLOR_BARS, 11); return; }
    Serial.printf("[COLUMN] %u\n", step_);
    renderColumnTest();
    return;
  }
  if (test_ == Test::MOVING_PIXEL) {
    ++movingPixel_;
    if (movingPixel_ >= 2 * (WIDTH + HEIGHT) - 4) { startTest(Test::MOVING_BLOCK, 14); return; }
    renderMovingPixel();
    return;
  }
  if (test_ == Test::MOVING_BLOCK) {
    movingBlockX_ += movingBlockDx_;
    movingBlockY_ += movingBlockDy_;
    if (movingBlockX_ <= 0 || movingBlockX_ >= WIDTH - 4) movingBlockDx_ = -movingBlockDx_;
    if (movingBlockY_ <= 0 || movingBlockY_ >= HEIGHT - 4) movingBlockDy_ = -movingBlockDy_;
    renderMovingBlock();
    return;
  }

  if (testNumber_ >= TEST_COUNT) startTest(Test::BLACK, 1);
  else startTest(static_cast<Test>(testNumber_), static_cast<uint8_t>(testNumber_ + 1));
}
