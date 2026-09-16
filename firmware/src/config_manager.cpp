#include "config_manager.h"
#include <ArduinoJson.h>

namespace {
const char* DEFAULT_CONFIG = R"json({"schemaVersion":4,"display":{"enabled":true,"brightness":25,"maxBrightness":100,"nightMode":true,"scheduleEnabled":true,"brightnessMode":"schedule","brightnessSchedule":[{"id":"morning","time":"07:00","brightness":45},{"id":"evening","time":"18:00","brightness":25},{"id":"late","time":"22:00","brightness":8},{"id":"midnight","time":"00:00","brightness":2}]},"clock":{"layout":"minimal","use24Hour":true,"showSeconds":false,"showDate":true,"timeColor":"#f4f7ff","dateColor":"#72e6a8","dividerColor":"#43506f","backgroundColor":"#000000","showStatusIndicator":true,"timezone":"Europe/Amsterdam"},"layouts":[],"rules":[],"profiles":[]})json";

void mergeJson(JsonVariant destination, JsonVariantConst source) {
  if (source.is<JsonObjectConst>()) {
    if (!destination.is<JsonObject>()) destination.to<JsonObject>();
    JsonObject target = destination.as<JsonObject>();
    for (JsonPairConst item : source.as<JsonObjectConst>()) {
      mergeJson(target[item.key()], item.value());
    }
    return;
  }
  destination.set(source);
}
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
  bool storageMigration = false;
  const uint8_t storedLayoutCount = preferences_.getUChar("lcount", 0);
  if (storedLayoutCount > 0) {
    JsonArray storedLayouts = document["layouts"].to<JsonArray>();
    storedLayouts.clear();
    for (uint8_t index = 0; index < storedLayoutCount; ++index) {
      const String key = String("l") + index;
      const String storedLayout = preferences_.getString(key.c_str(), "");
      if (storedLayout.isEmpty()) continue;
      JsonDocument layoutDocument;
      if (deserializeJson(layoutDocument, storedLayout) == DeserializationError::Ok && layoutDocument.is<JsonObject>()) {
        storedLayouts.add(layoutDocument.as<JsonObjectConst>());
      }
    }
  } else {
    // Compatibility with the first split-storage build, which used one
    // (potentially too large) NVS string for the complete layout array.
    const String storedLayouts = preferences_.getString("layouts", "");
    if (!storedLayouts.isEmpty()) {
      JsonDocument layoutsDocument;
      if (deserializeJson(layoutsDocument, storedLayouts) == DeserializationError::Ok && layoutsDocument.is<JsonArray>()) {
        document["layouts"] = layoutsDocument.as<JsonArrayConst>();
        storageMigration = true;
      }
    } else if (document["layouts"].is<JsonArray>() && !document["layouts"].isNull() && document["layouts"].size() > 0) {
      storageMigration = true;
    }
  }
  // Older production builds could persist a partial top-level config when a
  // portal update arrived before the full schema was present. Restore missing
  // objects from the current defaults without overwriting user values.
  JsonDocument defaults;
  deserializeJson(defaults, DEFAULT_CONFIG);
  bool repaired = false;
  if (!document["display"].is<JsonObject>()) {
    document["display"] = defaults["display"];
    repaired = true;
  }
  if (!document["clock"].is<JsonObject>()) {
    document["clock"] = defaults["clock"];
    repaired = true;
  }
  if (!document["layouts"].is<JsonArray>()) {
    document["layouts"] = defaults["layouts"];
    repaired = true;
  }
  if (!document["rules"].is<JsonArray>()) {
    document["rules"] = defaults["rules"];
    repaired = true;
  }
  if (!document["profiles"].is<JsonArray>()) {
    document["profiles"] = defaults["profiles"];
    repaired = true;
  }
  const uint8_t storedVersion = document["schemaVersion"] | 1;
  if (storedVersion < CURRENT_SCHEMA_VERSION || repaired || storageMigration) {
    if (storedVersion < 4) {
      String background = document["clock"]["backgroundColor"] | "";
      background.toLowerCase();
      if (background == "#050915") document["clock"]["backgroundColor"] = "#000000";
    }
    document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
    persistDocument(document);
  } else {
    String loaded;
    serializeJson(document, loaded);
    configJson_ = loaded;
  }
}

String ConfigManager::json() const { return configJson_; }

bool ConfigManager::saveJson(const String& json) {
  JsonDocument patch;
  if (deserializeJson(patch, json) != DeserializationError::Ok || !patch.is<JsonObject>()) return false;
  JsonDocument document;
  if (deserializeJson(document, configJson_) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  for (JsonPair item : patch.as<JsonObject>()) {
    mergeJson(document[item.key()], item.value());
  }
  document["schemaVersion"] = CURRENT_SCHEMA_VERSION;
  return persistDocument(document);
}

bool ConfigManager::saveLayout(const String& json) {
  JsonDocument layout;
  if (deserializeJson(layout, json) != DeserializationError::Ok || !layout.is<JsonObject>() ||
      !layout["id"].is<const char*>() || !layout["elements"].is<JsonArray>()) {
    return false;
  }

  JsonDocument document;
  if (deserializeJson(document, configJson_) != DeserializationError::Ok || !document.is<JsonObject>()) return false;
  JsonArray layouts = document["layouts"].as<JsonArray>();
  if (layouts.isNull()) layouts = document["layouts"].to<JsonArray>();

  const String layoutId = layout["id"].as<String>();
  for (JsonObject existing : layouts) {
    if (String(existing["id"] | "") != layoutId) continue;
    existing.clear();
    existing.set(layout.as<JsonObjectConst>());
    return persistDocument(document);
  }

  layouts.add(layout.as<JsonObjectConst>());
  return persistDocument(document);
}

bool ConfigManager::persistDocument(JsonDocument& document) {
  JsonArrayConst layouts = document["layouts"].as<JsonArrayConst>();
  const uint8_t layoutCount = layouts.isNull() ? 0 : static_cast<uint8_t>(min<size_t>(layouts.size(), 32));
  for (uint8_t index = 0; index < layoutCount; ++index) {
    String layoutJson;
    serializeJson(layouts[index], layoutJson);
    const String key = String("l") + index;
    if (preferences_.putString(key.c_str(), layoutJson) != layoutJson.length()) return false;
  }
  const uint8_t oldLayoutCount = preferences_.getUChar("lcount", 0);
  for (uint8_t index = layoutCount; index < oldLayoutCount; ++index) {
    const String key = String("l") + index;
    preferences_.remove(key.c_str());
  }
  preferences_.putUChar("lcount", layoutCount);
  preferences_.remove("layouts");

  String fullJson;
  serializeJson(document, fullJson);
  document.remove("layouts");
  String baseJson;
  serializeJson(document, baseJson);
  if (preferences_.putString("config", baseJson) != baseJson.length()) return false;

  configJson_ = fullJson;
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
  preferences_.remove("layouts");
  const uint8_t storedLayoutCount = preferences_.getUChar("lcount", 0);
  for (uint8_t index = 0; index < storedLayoutCount; ++index) {
    const String key = String("l") + index;
    preferences_.remove(key.c_str());
  }
  preferences_.remove("lcount");
  preferences_.remove("wifi_ssid");
  preferences_.remove("wifi_pass");
  preferences_.remove("hostname");
  configJson_ = DEFAULT_CONFIG;
  return true;
}
