#include "display_manager.h"

bool DisplayManager::begin() {
  output_ = &hub75Output_;
  if (!output_->begin()) { output_ = nullptr; return false; }
  mode_ = DisplayMode::TEST;
  lastPatternAt_ = millis();
  renderTestPattern(testIndex_);
  return true;
}

uint16_t DisplayManager::color(uint8_t red, uint8_t green, uint8_t blue) const {
  return output_ ? output_->color565(red, green, blue) : 0;
}

void DisplayManager::setBrightness(uint8_t percentage) {
  brightness_ = constrain(percentage, 0, 100);
  if (output_) output_->setBrightness(brightness_);
}

String DisplayManager::modeName() const {
  switch (mode_) {
    case DisplayMode::TEST: return "TEST";
    case DisplayMode::CLOCK: return "CLOCK";
    case DisplayMode::MESSAGE: return "MESSAGE";
    case DisplayMode::WEATHER: return "WEATHER";
    case DisplayMode::ALERT: return "ALERT";
    case DisplayMode::TIMER: return "TIMER";
    case DisplayMode::OFF: return "OFF";
    case DisplayMode::SLEEP: return "SLEEP";
    default: return "BOOT";
  }
}

void DisplayManager::setMode(DisplayMode mode) {
  mode_ = mode;
  if (output_ && (mode_ == DisplayMode::OFF || mode_ == DisplayMode::SLEEP)) output_->clearScreen();
}

void DisplayManager::renderTestPattern(uint8_t index) {
  if (!output_) return;
  output_->clearScreen();
  switch (index) {
    case 0: output_->fillScreen(color(255, 0, 0)); break;
    case 1: output_->fillScreen(color(0, 255, 0)); break;
    case 2: output_->fillScreen(color(0, 0, 255)); break;
    case 3: output_->fillScreen(color(255, 255, 255)); break;
    case 4: break;
    case 5:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 4) output_->drawFastHLine(0, y, HardwareConfig::MATRIX_WIDTH, color(255, 255, 255));
      break;
    case 6:
      for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 4) output_->drawFastVLine(x, 0, HardwareConfig::MATRIX_HEIGHT, color(255, 255, 255));
      break;
    case 7:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 4) for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 4) if (((x / 4) + (y / 4)) % 2 == 0) output_->fillRect(x, y, 4, 4, color(255, 255, 255));
      break;
    case 8:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 8) for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 8) output_->drawPixel(x, y, color(255, 120, 0));
      break;
    case 9:
      output_->setTextSize(2); output_->setTextColor(color(0, 255, 150)); output_->setCursor(6, 20); output_->print("SMART"); output_->setCursor(12, 42); output_->print("MATRIX");
      break;
    case 10:
      output_->setTextSize(2); output_->setTextColor(color(255, 255, 255)); output_->setCursor(12, 28); output_->print("128 x 64");
      break;
    case 11:
      output_->fillRect(0, 0, 42, 64, color(255, 0, 0)); output_->fillRect(43, 0, 42, 64, color(0, 255, 0)); output_->fillRect(86, 0, 42, 64, color(0, 0, 255));
      break;
    case 12: renderMovingBlock(); break;
    default: break;
  }
}

void DisplayManager::renderMovingBlock() {
  if (!output_) return;
  output_->clearScreen();
  output_->fillRect(movingX_, 24, 16, 16, color(255, 120, 0));
  movingX_ = (movingX_ + 2) % (HardwareConfig::MATRIX_WIDTH - 15);
}

void DisplayManager::update() {
  if (!output_ || mode_ != DisplayMode::TEST) return;
  const uint32_t now = millis();
  if (now - lastPatternAt_ >= 2500) {
    lastPatternAt_ = now;
    testIndex_ = (testIndex_ + 1) % 13;
    renderTestPattern(testIndex_);
  } else if (testIndex_ == 12 && now - lastFrameAt_ >= 60) {
    lastFrameAt_ = now;
    renderMovingBlock();
  }
}
