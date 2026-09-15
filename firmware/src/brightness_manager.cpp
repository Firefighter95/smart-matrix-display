#include "brightness_manager.h"
#include <ArduinoJson.h>
#include <cstdio>

namespace {
int minutesFromTime(const String& value) {
  int hours = -1;
  int minutes = -1;
  if (sscanf(value.c_str(), "%d:%d", &hours, &minutes) != 2) return -1;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}
}

void BrightnessManager::begin(DisplayManager& display, ConfigManager& config, TimeManager& time) {
  display_ = &display;
  config_ = &config;
  time_ = &time;
  lastApplyAt_ = 0;
}

uint8_t BrightnessManager::scheduledBrightness(const JsonDocument& document, const struct tm& local) const {
  const JsonObjectConst display = document["display"].as<JsonObjectConst>();
  const uint8_t fallback = display["brightness"] | 25;
  if (!(display["scheduleEnabled"] | false)) return fallback;

  const String mode = display["brightnessMode"] | "schedule";
  if (mode != "schedule") return fallback;

  const JsonArrayConst schedule = display["brightnessSchedule"].as<JsonArrayConst>();
  if (schedule.isNull() || schedule.size() == 0) return fallback;

  const int nowMinutes = local.tm_hour * 60 + local.tm_min;
  int bestDistance = 1441;
  uint8_t selected = fallback;
  for (JsonObjectConst entry : schedule) {
    const int entryMinutes = minutesFromTime(entry["time"] | "");
    if (entryMinutes < 0) continue;
    const int distance = (nowMinutes - entryMinutes + 1440) % 1440;
    if (distance < bestDistance) {
      bestDistance = distance;
      selected = constrain(static_cast<int>(entry["brightness"] | fallback), 0, 100);
    }
  }
  return selected;
}

void BrightnessManager::update() {
  if (!display_ || !config_ || !time_) return;
  if (millis() - lastApplyAt_ < 1000) return;
  lastApplyAt_ = millis();

  JsonDocument document;
  if (deserializeJson(document, config_->json()) != DeserializationError::Ok) return;

  struct tm local;
  const bool hasLocalTime = time_->localTime(local);
  const JsonObject display = document["display"].as<JsonObject>();
  const uint8_t manual = display["brightness"] | 25;
  uint8_t requested = manual;
  if (hasLocalTime) requested = scheduledBrightness(document, local);

  const uint8_t maximum = display["maxBrightness"] | 100;
  const uint8_t next = min(requested, maximum);
  if (next != current_) {
    current_ = next;
    display_->setBrightness(current_);
  }
}
