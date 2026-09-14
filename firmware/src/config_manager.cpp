#include "config_manager.h"
#include <ArduinoJson.h>

namespace {
const char* DEFAULT_CONFIG = R"json({"schemaVersion":4,"display":{"enabled":true,"brightness":25,"maxBrightness":100,"nightMode":true,"scheduleEnabled":true,"brightnessMode":"schedule","brightnessSchedule":[{"id":"morning","time":"07:00","brightness":45},{"id":"evening","time":"18:00","brightness":25},{"id":"late","time":"22:00","brightness":8},{"id":"midnight","time":"00:00","brightness":2}]},"clock":{"layout":"minimal","use24Hour":true,"showSeconds":false,"showDate":true,"timeColor":"#f4f7ff","dateColor":"#72e6a8","dividerColor":"#43506f","backgroundColor":"#000000","showStatusIndicator":true,"timezone":"Europe/Amsterdam"},"layouts":[],"rules":[],"profiles":[]})json";
}

void ConfigManager::begin() {
  preferences_.begin("smartmatrix", false);
  configJson_ = preferences_.getString("config", DEFAULT_CONFIG);
  if (configJson_.isEmpty()) configJson_ = DEFAULT_CONFIG;

  JsonDocument document;
  if (deserializeJson(document, configJson_) != DeserializationError::Ok || !document.is<JsonObject>()) {
    configJson_ = DEFAULT_CONFIG;
    preferences_.putString("config", configJson_);
    return;
  }
  const uint8_t storedVersion = document["schemaVersion"] | 1;
  if (storedVersion < CURRENT_SCHEMA_VERSION) {
    if (storedVersion < 4) {
      String background = document["clock"]["backgroundColor"] | "";
      background.toLowerCase();
      if (background == "#050915") document["clock"]["backgroundColor"] = "#000000";
    }
    document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
    String migrated;
    serializeJson(document, migrated);
    configJson_ = migrated;
    preferences_.putString("config", configJson_);
  }
}

String ConfigManager::json() const { return configJson_; }

bool ConfigManager::saveJson(const String& json) {
  JsonDocument patch;
  if (deserializeJson(patch, json) != DeserializationError::Ok || !patch.is<JsonObject>()) return false;
  JsonDocument document;
  if (deserializeJson(document, configJson_) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  for (JsonPair item : patch.as<JsonObject>()) document[item.key()] = item.value();
  document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
  String normalized;
  serializeJson(document, normalized);
  configJson_ = normalized;
  preferences_.putString("config", configJson_);
  return true;
}

bool ConfigManager::saveWifi(const String& ssid, const String& password, const String& hostname) {
  if (ssid.length() > 32 || password.length() > 63 || hostname.length() > 32) return false;
  preferences_.putString("wifi_ssid", ssid);
  preferences_.putString("wifi_pass", password);
  preferences_.putString("hostname", hostname.isEmpty() ? "smartmatrix" : hostname);
  return true;
}

String ConfigManager::wifiSsid() { return preferences_.getString("wifi_ssid", ""); }
String ConfigManager::wifiPassword() { return preferences_.getString("wifi_pass", ""); }
String ConfigManager::hostname() { return preferences_.getString("hostname", "smartmatrix"); }

bool ConfigManager::reset() {
  preferences_.remove("config");
  preferences_.remove("wifi_ssid");
  preferences_.remove("wifi_pass");
  preferences_.remove("hostname");
  configJson_ = DEFAULT_CONFIG;
  return true;
}
