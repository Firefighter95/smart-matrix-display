#include "display_manager.h"

bool DisplayManager::begin() {
  HUB75_I2S_CFG config(HardwareConfig::MATRIX_WIDTH, HardwareConfig::MATRIX_HEIGHT, HardwareConfig::PANEL_CHAIN, HardwareConfig::pinMap());
  config.driver = HardwareConfig::SHIFT_DRIVER;
  config.i2sspeed = HardwareConfig::CLOCK_SPEED;
  config.double_buff = HardwareConfig::DOUBLE_BUFFER;
  config.clkphase = HardwareConfig::CLOCK_PHASE;
  panel_ = new MatrixPanel_I2S_DMA(config);
  if (!panel_ || !panel_->begin()) {
    delete panel_;
    panel_ = nullptr;
    return false;
  }
  panel_->setBrightness8(64);
  panel_->clearScreen();
  mode_ = DisplayMode::TEST;
  lastPatternAt_ = millis();
  renderTestPattern(testIndex_);
  return true;
}

uint16_t DisplayManager::color(uint8_t red, uint8_t green, uint8_t blue) const {
  return panel_ ? panel_->color565(red, green, blue) : 0;
}

void DisplayManager::setBrightness(uint8_t percentage) {
  brightness_ = constrain(percentage, 0, 100);
  if (panel_) panel_->setBrightness8(static_cast<uint8_t>(brightness_ * 255 / 100));
}

String DisplayManager::modeName() const {
  switch (mode_) {
    case DisplayMode::TEST: return "TEST";
    case DisplayMode::CLOCK: return "CLOCK";
    case DisplayMode::MESSAGE: return "MESSAGE";
    case DisplayMode::WEATHER: return "WEATHER";
    case DisplayMode::OFF: return "OFF";
    default: return "BOOT";
  }
}

void DisplayManager::setMode(DisplayMode mode) {
  mode_ = mode;
  if (panel_ && mode_ == DisplayMode::OFF) panel_->clearScreen();
}

void DisplayManager::renderTestPattern(uint8_t index) {
  if (!panel_) return;
  panel_->clearScreen();
  switch (index) {
    case 0: panel_->fillScreen(color(255, 0, 0)); break;
    case 1: panel_->fillScreen(color(0, 255, 0)); break;
    case 2: panel_->fillScreen(color(0, 0, 255)); break;
    case 3: panel_->fillScreen(color(255, 255, 255)); break;
    case 4: break;
    case 5:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 4) panel_->drawFastHLine(0, y, HardwareConfig::MATRIX_WIDTH, color(255, 255, 255));
      break;
    case 6:
      for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 4) panel_->drawFastVLine(x, 0, HardwareConfig::MATRIX_HEIGHT, color(255, 255, 255));
      break;
    case 7:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 4) for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 4) if (((x / 4) + (y / 4)) % 2 == 0) panel_->fillRect(x, y, 4, 4, color(255, 255, 255));
      break;
    case 8:
      for (int y = 0; y < HardwareConfig::MATRIX_HEIGHT; y += 8) for (int x = 0; x < HardwareConfig::MATRIX_WIDTH; x += 8) panel_->drawPixel(x, y, color(255, 120, 0));
      break;
    case 9:
      panel_->setTextSize(2); panel_->setTextColor(color(0, 255, 150)); panel_->setCursor(6, 20); panel_->print("SMART"); panel_->setCursor(12, 42); panel_->print("MATRIX");
      break;
    case 10:
      panel_->setTextSize(2); panel_->setTextColor(color(255, 255, 255)); panel_->setCursor(12, 28); panel_->print("128 x 64");
      break;
    case 11:
      panel_->fillRect(0, 0, 42, 64, color(255, 0, 0)); panel_->fillRect(43, 0, 42, 64, color(0, 255, 0)); panel_->fillRect(86, 0, 42, 64, color(0, 0, 255));
      break;
    case 12: renderMovingBlock(); break;
    default: break;
  }
}

void DisplayManager::renderMovingBlock() {
  if (!panel_) return;
  panel_->clearScreen();
  panel_->fillRect(movingX_, 24, 16, 16, color(255, 120, 0));
  movingX_ = (movingX_ + 2) % (HardwareConfig::MATRIX_WIDTH - 15);
}

void DisplayManager::update() {
  if (!panel_ || mode_ != DisplayMode::TEST) return;
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
