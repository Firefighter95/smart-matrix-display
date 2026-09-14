#include "weather_screen.h"

#include <ArduinoJson.h>
#include <cstdlib>
#include <ctime>

uint16_t WeatherScreen::colorFromHex(const String& value, uint16_t fallback) const {
  if (value.length() != 7 || value[0] != '#') return fallback;
  const long parsed = strtol(value.substring(1).c_str(), nullptr, 16);
  if (parsed < 0) return fallback;
  return display_.output()->color565((parsed >> 16) & 0xFF, (parsed >> 8) & 0xFF, parsed & 0xFF);
}

void WeatherScreen::begin() {
  lastRenderAt_ = 0;
}

bool WeatherScreen::setSnapshot(const String& json) {
  JsonDocument document;
  if (deserializeJson(document, json) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  if (!document["temperatureC"].is<float>() || !document["condition"].is<const char*>()) return false;
  snapshotJson_ = json;
  lastRenderAt_ = 0;
  return true;
}

void WeatherScreen::update() {
  if (!display_.output() || display_.mode() != DisplayMode::WEATHER || !hasSnapshot()) return;
  if (millis() - lastRenderAt_ < 1000) return;
  lastRenderAt_ = millis();
  render();
}

void WeatherScreen::render() {
  JsonDocument configDocument;
  deserializeJson(configDocument, config_.json());
  JsonObject clock = configDocument["clock"].as<JsonObject>();
  const uint16_t background = colorFromHex(clock["backgroundColor"] | "#000000", 0x0000);
  const uint16_t primary = colorFromHex(clock["timeColor"] | "#F4F7FF", 0xFFFF);
  const uint16_t secondary = colorFromHex(clock["dateColor"] | "#72E6A8", 0x07E0);
  const uint16_t divider = colorFromHex(clock["dividerColor"] | "#43506F", 0x431D);

  JsonDocument weather;
  deserializeJson(weather, snapshotJson_);
  const float temperature = weather["temperatureC"] | 0.0f;
  const float windKph = weather["windSpeedKph"] | 0.0f;
  const float windMs = windKph / 3.6f;
  const String condition = weather["condition"] | "WEER";

  display_.output()->fillScreen(background);
  display_.output()->setTextColor(primary);
  display_.output()->setTextSize(3);
  display_.output()->setCursor(4, 2);
  display_.output()->print(String(temperature, 1));
  display_.output()->print("C");

  display_.output()->setTextColor(secondary);
  display_.output()->setTextSize(2);
  display_.output()->setCursor(74, 8);
  display_.output()->print(String(windMs, 1));
  display_.output()->print("M/S");
  display_.output()->drawFastHLine(4, 32, 120, divider);

  display_.output()->setTextSize(1);
  display_.output()->setCursor(4, 40);
  display_.output()->print(condition.substring(0, 20));

  struct tm local;
  if (time_.localTime(local)) {
    char timeText[6];
    snprintf(timeText, sizeof(timeText), "%02d:%02d", local.tm_hour, local.tm_min);
    display_.output()->setTextColor(primary);
    display_.output()->setCursor(91, 40);
    display_.output()->print(timeText);
  }
  display_.output()->present();
}
