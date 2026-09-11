#include "display_output.h"

#include <ESP32-HUB75-MatrixPanel-I2S-DMA.h>

#include "hardware_config.h"

void MockDisplayOutput::fillScreen(uint16_t color) {
  for (uint16_t y = 0; y < HEIGHT; ++y) for (uint16_t x = 0; x < WIDTH; ++x) frame_[y * WIDTH + x] = color;
}

void MockDisplayOutput::drawPixel(int16_t x, int16_t y, uint16_t color) {
  if (x >= 0 && x < WIDTH && y >= 0 && y < HEIGHT) frame_[y * WIDTH + x] = color;
}

void MockDisplayOutput::drawFastHLine(int16_t x, int16_t y, int16_t width, uint16_t color) {
  for (int16_t column = 0; column < width; ++column) drawPixel(x + column, y, color);
}

void MockDisplayOutput::drawFastVLine(int16_t x, int16_t y, int16_t height, uint16_t color) {
  for (int16_t row = 0; row < height; ++row) drawPixel(x, y + row, color);
}

void MockDisplayOutput::fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) {
  for (int16_t row = 0; row < height; ++row) drawFastHLine(x, y + row, width, color);
}

void MockDisplayOutput::print(const String& text) {
  int16_t x = cursorX_;
  for (size_t index = 0; index < text.length(); ++index) {
    fillRect(x, cursorY_, 5 * textSize_, 7 * textSize_, textColor_);
    x += 6 * textSize_;
  }
}

uint16_t MockDisplayOutput::color565(uint8_t red, uint8_t green, uint8_t blue) const {
  return static_cast<uint16_t>(((red & 0xF8) << 8) | ((green & 0xFC) << 3) | (blue >> 3));
}

uint16_t MockDisplayOutput::pixel(int16_t x, int16_t y) const {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return 0;
  return frame_[y * WIDTH + x];
}

bool Hub75DisplayOutput::begin() {
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
  setBrightness(25);
  clearScreen();
  return true;
}

void Hub75DisplayOutput::clearScreen() { if (panel_) panel_->clearScreen(); }
void Hub75DisplayOutput::fillScreen(uint16_t color) { if (panel_) panel_->fillScreen(color); }
void Hub75DisplayOutput::drawPixel(int16_t x, int16_t y, uint16_t color) { if (panel_) panel_->drawPixel(x, y, color); }
void Hub75DisplayOutput::drawFastHLine(int16_t x, int16_t y, int16_t width, uint16_t color) { if (panel_) panel_->drawFastHLine(x, y, width, color); }
void Hub75DisplayOutput::drawFastVLine(int16_t x, int16_t y, int16_t height, uint16_t color) { if (panel_) panel_->drawFastVLine(x, y, height, color); }
void Hub75DisplayOutput::fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) { if (panel_) panel_->fillRect(x, y, width, height, color); }
void Hub75DisplayOutput::setTextSize(uint8_t size) { if (panel_) panel_->setTextSize(size); }
void Hub75DisplayOutput::setTextColor(uint16_t color) { if (panel_) panel_->setTextColor(color); }
void Hub75DisplayOutput::setCursor(int16_t x, int16_t y) { if (panel_) panel_->setCursor(x, y); }
void Hub75DisplayOutput::print(const String& text) { if (panel_) panel_->print(text); }
void Hub75DisplayOutput::setBrightness(uint8_t percentage) { if (panel_) panel_->setBrightness8(static_cast<uint8_t>(constrain(percentage, 0, 100) * 255 / 100)); }
uint16_t Hub75DisplayOutput::color565(uint8_t red, uint8_t green, uint8_t blue) const { return panel_ ? panel_->color565(red, green, blue) : 0; }
