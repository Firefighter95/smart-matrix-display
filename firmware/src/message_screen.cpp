#include "message_screen.h"

#include <ArduinoJson.h>
#include <cstdlib>

void MessageScreen::begin() {
  activeJson_ = "";
  activeLayoutId_ = "";
  expiresAt_ = 0;
  lastRenderAt_ = 0;
}

bool MessageScreen::showMessage(const String& json) { return show(json, false); }

bool MessageScreen::showEvent(const String& json) { return show(json, true); }

bool MessageScreen::show(const String& json, bool event) {
  JsonDocument document;
  if (deserializeJson(document, json) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  if (!event && !document["message"].is<const char*>()) return false;
  if (event && (!document["source"].is<const char*>() || !document["type"].is<const char*>())) return false;

  const uint8_t priority = constrain(static_cast<int>(document["priority"] | (event ? 50 : 60)), 0, 100);
  if (active() && priority < activePriority_ && static_cast<int32_t>(millis() - expiresAt_) < 0) return false;
  const uint32_t durationSeconds = max<uint32_t>(1, document["duration"] | (event ? 15 : 20));
  activeJson_ = json;
  activeLayoutId_ = document["layoutId"] | "generic-message";
  activePriority_ = priority;
  expiresAt_ = millis() + durationSeconds * 1000UL;
  lastRenderAt_ = 0;
  display_.setMode(DisplayMode::MESSAGE);
  return true;
}

void MessageScreen::clear() {
  activeJson_ = "";
  activeLayoutId_ = "";
  activePriority_ = 0;
  expiresAt_ = 0;
  lastRenderAt_ = 0;
  display_.setMode(DisplayMode::CLOCK);
}

void MessageScreen::update() {
  if (display_.mode() != DisplayMode::MESSAGE || !display_.output()) return;
  if (static_cast<int32_t>(millis() - expiresAt_) >= 0) {
    clear();
    return;
  }
  if (millis() - lastRenderAt_ < 250) return;
  lastRenderAt_ = millis();
  render();
}

void MessageScreen::render() {
  JsonDocument config;
  if (deserializeJson(config, config_.json()) != DeserializationError::Ok) return;
  JsonDocument message;
  if (deserializeJson(message, activeJson_) != DeserializationError::Ok) return;
  JsonObject root = message.as<JsonObject>();
  const bool isEvent = root["payload"].is<JsonObject>();
  JsonObjectConst payload;
  if (isEvent) payload = root["payload"].as<JsonObjectConst>();
  else payload = root;
  const String layoutId = activeLayoutId_.isEmpty() ? "generic-message" : activeLayoutId_;
  const JsonObject clock = config["clock"].as<JsonObject>();
  const String backgroundHex = clock["backgroundColor"] | "#000000";
  const long backgroundValue = backgroundHex.startsWith("#") ? strtol(backgroundHex.substring(1).c_str(), nullptr, 16) : 0;
  const uint16_t background = display_.output()->color565((backgroundValue >> 16) & 0xFF, (backgroundValue >> 8) & 0xFF, backgroundValue & 0xFF);
  JsonArray layouts = config["layouts"].as<JsonArray>();
  for (JsonObject layout : layouts) {
    if (String(layout["id"] | "") == layoutId) {
      renderer_.render(layout, payload, clock, background);
      return;
    }
  }

  // Fallback for devices with a config created before the standard message
  // layout was added.
  display_.output()->fillScreen(background);
  display_.output()->setTextColor(display_.output()->color565(114, 230, 168));
  display_.output()->setTextSize(2);
  display_.output()->setCursor(4, 7);
  const String fallbackTitle = payload["title"] | "BERICHT";
  const String fallbackMessage = payload["message"] | "";
  display_.output()->print(fallbackTitle.substring(0, 10));
  display_.output()->drawFastHLine(4, 25, 120, display_.output()->color565(67, 80, 111));
  display_.output()->setTextColor(0xFFFF);
  display_.output()->setTextSize(1);
  display_.output()->setCursor(4, 34);
  display_.output()->print(fallbackMessage.substring(0, 20));
  display_.drawAudioIndicator();
  display_.output()->present();
}
