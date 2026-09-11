#pragma once

#include <Arduino.h>

class IDisplayOutput {
public:
  virtual ~IDisplayOutput() = default;
  virtual bool begin() = 0;
  virtual void clearScreen() = 0;
  virtual void fillScreen(uint16_t color) = 0;
  virtual void drawPixel(int16_t x, int16_t y, uint16_t color) = 0;
  virtual void drawFastHLine(int16_t x, int16_t y, int16_t width, uint16_t color) = 0;
  virtual void drawFastVLine(int16_t x, int16_t y, int16_t height, uint16_t color) = 0;
  virtual void fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) = 0;
  virtual void setTextSize(uint8_t size) = 0;
  virtual void setTextColor(uint16_t color) = 0;
  virtual void setCursor(int16_t x, int16_t y) = 0;
  virtual void print(const String& text) = 0;
  virtual void setBrightness(uint8_t percentage) = 0;
  virtual uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) const = 0;
};

class MockDisplayOutput final : public IDisplayOutput {
public:
  bool begin() override { ready_ = true; clearScreen(); return true; }
  void clearScreen() override { fillScreen(0); }
  void fillScreen(uint16_t color) override;
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void drawFastHLine(int16_t x, int16_t y, int16_t width, uint16_t color) override;
  void drawFastVLine(int16_t x, int16_t y, int16_t height, uint16_t color) override;
  void fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) override;
  void setTextSize(uint8_t size) override { textSize_ = size; }
  void setTextColor(uint16_t color) override { textColor_ = color; }
  void setCursor(int16_t x, int16_t y) override { cursorX_ = x; cursorY_ = y; }
  void print(const String& text) override;
  void setBrightness(uint8_t percentage) override { brightness_ = percentage; }
  uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) const override;
  bool ready() const { return ready_; }
  uint16_t pixel(int16_t x, int16_t y) const;
  uint8_t brightness() const { return brightness_; }

private:
  static constexpr uint16_t WIDTH = 128;
  static constexpr uint16_t HEIGHT = 64;
  uint16_t frame_[WIDTH * HEIGHT]{};
  bool ready_ = false;
  uint8_t brightness_ = 100;
  uint8_t textSize_ = 1;
  uint16_t textColor_ = 0xFFFF;
  int16_t cursorX_ = 0;
  int16_t cursorY_ = 0;
};

class Hub75DisplayOutput final : public IDisplayOutput {
public:
  bool begin() override;
  void clearScreen() override;
  void fillScreen(uint16_t color) override;
  void drawPixel(int16_t x, int16_t y, uint16_t color) override;
  void drawFastHLine(int16_t x, int16_t y, int16_t width, uint16_t color) override;
  void drawFastVLine(int16_t x, int16_t y, int16_t height, uint16_t color) override;
  void fillRect(int16_t x, int16_t y, int16_t width, int16_t height, uint16_t color) override;
  void setTextSize(uint8_t size) override;
  void setTextColor(uint16_t color) override;
  void setCursor(int16_t x, int16_t y) override;
  void print(const String& text) override;
  void setBrightness(uint8_t percentage) override;
  uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) const override;
  bool ready() const { return panel_ != nullptr; }

private:
  class MatrixPanel_I2S_DMA* panel_ = nullptr;
};
