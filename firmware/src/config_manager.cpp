#include "config_manager.h"
#include <ArduinoJson.h>

namespace {
const char* DEFAULT_CONFIG = R"json({"schemaVersion":2,"display":{"enabled":true,"brightness":25,"maxBrightness":100,"nightMode":true,"scheduleEnabled":true,"brightnessMode":"schedule","brightnessSchedule":[{"id":"morning","time":"07:00","brightness":45},{"id":"evening","time":"18:00","brightness":25},{"id":"late","time":"22:00","brightness":8},{"id":"midnight","time":"00:00","brightness":2}]},"clock":{"layout":"minimal","use24Hour":true,"showSeconds":false,"showDate":true,"timeColor":"#f4f7ff","dateColor":"#72e6a8","dividerColor":"#43506f","backgroundColor":"#050915","showStatusIndicator":true,"timezone":"Europe/Amsterdam"},"layouts":[],"rules":[],"profiles":[]})json";
}

void ConfigManager::begin() {
  preferences_.begin("smartmatrix", false);
  configJson_ = preferences_.getString("config", DEFAULT_CONFIG);
  if (configJson_.isEmpty()) configJson_ = DEFAULT_CONFIG;

  DynamicJsonDocument document(4096);
  if (deserializeJson(document, configJson_) != DeserializationError::Ok || !document.is<JsonObject>()) {
    configJson_ = DEFAULT_CONFIG;
    preferences_.putString("config", configJson_);
    return;
  }
  const uint8_t storedVersion = document["schemaVersion"] | 1;
  if (storedVersion < CURRENT_SCHEMA_VERSION) {
    document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
    String migrated;
    serializeJson(document, migrated);
    configJson_ = migrated;
    preferences_.putString("config", configJson_);
  }
}

String ConfigManager::json() const { return configJson_; }

bool ConfigManager::saveJson(const String& json) {
  DynamicJsonDocument document(8192);
  if (deserializeJson(document, json) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
  String normalized;
  serializeJson(document, normalized);
  configJson_ = normalized;
  preferences_.putString("config", configJson_);
  return true;
}

bool ConfigManager::reset() {
  preferences_.remove("config");
  configJson_ = DEFAULT_CONFIG;
  return true;
}
