#include "clock_screen.h"

#include <ArduinoJson.h>
#include <cstdlib>
#include <cstring>
#include <time.h>

namespace {
const char* WEEKDAYS[] = {"ZO", "MA", "DI", "WO", "DO", "VR", "ZA"};
const char* MONTHS[] = {"JANUARI", "FEBRUARI", "MAART", "APRIL", "MEI", "JUNI",
                        "JULI", "AUGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"};
}

uint16_t ClockScreen::colorFromHex(const String& value, uint16_t fallback) const {
  if (value.length() != 7 || value[0] != '#') return fallback;
  const long parsed = strtol(value.substring(1).c_str(), nullptr, 16);
  if (parsed < 0) return fallback;
  return display_.output()->color565((parsed >> 16) & 0xFF, (parsed >> 8) & 0xFF, parsed & 0xFF);
}

void ClockScreen::dateText(const struct tm& local, char* buffer, size_t length) const {
  snprintf(buffer, length, "%s %02d %s", WEEKDAYS[local.tm_wday], local.tm_mday, MONTHS[local.tm_mon]);
}

void ClockScreen::begin() {
  lastSecond_ = -1;
  animatedLayout_ = false;
  lastFrameAtMs_ = 0;
  if (display_.mode() == DisplayMode::CLOCK) render();
}

void ClockScreen::update() {
  if (display_.mode() != DisplayMode::CLOCK || !display_.output()) return;
  struct tm local;
  if (!time_.localTime(local)) {
    if ((animatedLayout_ && millis() - lastFrameAtMs_ >= 100) || millis() % 2000 < 40) render();
    return;
  }
  if (local.tm_sec != lastSecond_ || (animatedLayout_ && millis() - lastFrameAtMs_ >= 100)) render();
}

void ClockScreen::render() {
  if (!display_.output()) return;
  JsonDocument document;
  deserializeJson(document, config_.json());
  JsonObject clock = document["clock"].as<JsonObject>();
  const bool use24Hour = clock["use24Hour"] | true;
  const bool showSeconds = clock["showSeconds"] | false;
  const bool showDate = clock["showDate"] | true;
  const String layout = clock["layout"] | "minimal";
  const uint16_t background = colorFromHex(clock["backgroundColor"] | "#000000", 0x0000);
  const uint16_t timeColor = colorFromHex(clock["timeColor"] | "#F4F7FF", 0xFFFF);
  const uint16_t dateColor = colorFromHex(clock["dateColor"] | "#72E6A8", 0x07E0);
  const uint16_t dividerColor = colorFromHex(clock["dividerColor"] | "#43506F", 0x431D);
  display_.output()->fillScreen(background);

  struct tm local;
  const bool hasLocalTime = time_.localTime(local);

  // Prefer the editable 128x64 layouts stored by the portal. The legacy
  // renderer below remains available for older configurations.
  const String activeLayoutId = document["activeLayoutId"] | "";
  JsonArray layouts = document["layouts"].as<JsonArray>();
  animatedLayout_ = false;
  if (!activeLayoutId.isEmpty()) {
    for (JsonObject layoutModel : layouts) {
      const String category = layoutModel["category"] | "";
      if (String(layoutModel["id"] | "") == activeLayoutId &&
          (category == "clock" || category == "weather" || category == "system")) {
        animatedLayout_ = renderer_.hasHorizontalScroll(layoutModel);
        renderer_.render(layoutModel, JsonObjectConst(), clock, background);
        lastFrameAtMs_ = millis();
        if (hasLocalTime) lastSecond_ = local.tm_sec;
        return;
      }
    }
  }

  char timeText[12] = "--:--";
  if (hasLocalTime) {
    if (use24Hour) {
      snprintf(timeText, sizeof(timeText), showSeconds ? "%02d:%02d:%02d" : "%02d:%02d", local.tm_hour, local.tm_min, local.tm_sec);
    } else {
      int hour = local.tm_hour % 12;
      if (hour == 0) hour = 12;
      snprintf(timeText, sizeof(timeText), showSeconds ? "%2d:%02d:%02d" : "%2d:%02d", hour, local.tm_min, local.tm_sec);
    }
  }

  if (layout == "builder") {
    JsonArray elements = clock["elements"].as<JsonArray>();
    JsonDocument weatherDocument;
    if (weather_.hasSnapshot()) deserializeJson(weatherDocument, weather_.snapshotJson());

    const bool hasTemperature = weatherDocument["temperatureC"].is<float>();
    const bool hasWind = weatherDocument["windSpeedKph"].is<float>();
    const float temperature = weatherDocument["temperatureC"] | 0.0f;
    const float windMs = (weatherDocument["windSpeedKph"] | 0.0f) / 3.6f;

    String date = "--";
    if (hasLocalTime && showDate) {
      char dateBuffer[24];
      dateText(local, dateBuffer, sizeof(dateBuffer));
      date = dateBuffer;
    }

    const uint16_t statusColor = !wifi_.networkReady() ? display_.output()->color565(255, 60, 60)
                                : !time_.synced() ? display_.output()->color565(255, 180, 0)
                                                  : display_.output()->color565(80, 255, 120);
    String fault;
    if (!wifi_.networkReady()) fault = "WIFI UIT";
    if (!time_.synced()) {
      if (!fault.isEmpty()) fault += " ";
      fault += "NTP FOUT";
    }

    for (JsonObject element : elements) {
      if (!(element["enabled"] | true)) continue;
      const String id = element["id"] | "";
      const int16_t x = constrain(element["x"] | 0, 0, HardwareConfig::MATRIX_WIDTH - 1);
      const int16_t y = constrain(element["y"] | 0, 0, HardwareConfig::MATRIX_HEIGHT - 1);
      const uint8_t scale = constrain(element["scale"] | 1, 1, 4);

      if (id == "status") {
        if (clock["showStatusIndicator"] | true) display_.output()->fillRect(x, y, 3, 3, statusColor);
        continue;
      }
      if (id == "fault") {
        if (!fault.isEmpty()) {
          display_.output()->setTextSize(scale);
          display_.output()->setTextColor(statusColor);
          display_.output()->setCursor(x, y);
          display_.output()->print(fault.substring(0, 21));
        }
        continue;
      }

      String value;
      if (id == "time") value = timeText;
      else if (id == "date") value = date;
      else if (id == "temperature") value = hasTemperature ? String(temperature, 1) + "C" : "--.-C";
      else if (id == "wind") value = hasWind ? String(windMs, 1) + "M/S" : "--.-M/S";
      else continue;

      display_.output()->setTextSize(scale);
      display_.output()->setTextColor(id == "time" ? timeColor : dateColor);
      display_.output()->setCursor(x, y);
      display_.output()->print(value);
    }
    display_.drawAudioIndicator();
    display_.output()->present();
    if (hasLocalTime) lastSecond_ = local.tm_sec;
    return;
  }

  if (!hasLocalTime) {
    display_.output()->setTextSize(2);
    display_.output()->setTextColor(timeColor);
    display_.output()->setCursor(31, 24);
    display_.output()->print("--:--");
    display_.output()->setTextSize(1);
    display_.output()->setTextColor(dateColor);
    display_.output()->setCursor(45, 52);
    display_.output()->print("NTP");
    display_.drawAudioIndicator();
    display_.output()->present();
    return;
  }

  const uint8_t size = showSeconds ? 2 : (layout == "compact" ? 2 : 3);
  const int16_t width = static_cast<int16_t>(strlen(timeText) * 6 * size);
  const int16_t x = max<int16_t>(0, (HardwareConfig::MATRIX_WIDTH - width) / 2);
  const int16_t y = layout == "compact" ? 5 : (layout == "classic" ? 10 : 7);
  display_.output()->setTextSize(size);
  display_.output()->setTextColor(timeColor);
  display_.output()->setCursor(x, y);
  display_.output()->print(timeText);

  if (layout != "compact") display_.output()->drawFastHLine(12, 42, 104, dividerColor);
  if (showDate) {
    char date[24];
    dateText(local, date, sizeof(date));
    display_.output()->setTextSize(1);
    display_.output()->setTextColor(dateColor);
    const int16_t dateWidth = static_cast<int16_t>(strlen(date) * 6);
    display_.output()->setCursor(max<int16_t>(0, (HardwareConfig::MATRIX_WIDTH - dateWidth) / 2), 49);
    display_.output()->print(date);
  }

  const uint16_t statusColor = !wifi_.networkReady() ? display_.output()->color565(255, 60, 60)
                              : !time_.synced() ? display_.output()->color565(255, 180, 0)
                                                : display_.output()->color565(80, 255, 120);
  display_.output()->fillRect(124, 1, 3, 3, statusColor);
  display_.drawAudioIndicator();
  display_.output()->present();
  lastSecond_ = local.tm_sec;
}
