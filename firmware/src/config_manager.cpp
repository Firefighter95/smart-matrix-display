#include "config_manager.h"

namespace {
const char* DEFAULT_CONFIG = R"json({"schemaVersion":1,"display":{"enabled":true,"brightness":25,"maxBrightness":100,"nightMode":true,"scheduleEnabled":true,"brightnessSchedule":[{"id":"morning","time":"07:00","brightness":45},{"id":"evening","time":"18:00","brightness":25},{"id":"late","time":"22:00","brightness":8},{"id":"midnight","time":"00:00","brightness":2}]},"clock":{"layout":"minimal","use24Hour":true,"showSeconds":false,"showDate":true,"timeColor":"#f4f7ff","dateColor":"#72e6a8","dividerColor":"#43506f","backgroundColor":"#050915","showStatusIndicator":true,"timezone":"Europe/Amsterdam"}})json";
}

void ConfigManager::begin() {
  preferences_.begin("smartmatrix", false);
  configJson_ = preferences_.getString("config", DEFAULT_CONFIG);
  if (configJson_.isEmpty()) configJson_ = DEFAULT_CONFIG;
}

String ConfigManager::json() const { return configJson_; }

bool ConfigManager::saveJson(const String& json) {
  if (json.length() < 2 || !json.startsWith("{")) return false;
  configJson_ = json;
  preferences_.putString("config", configJson_);
  return true;
}

bool ConfigManager::reset() {
  preferences_.remove("config");
  configJson_ = DEFAULT_CONFIG;
  return true;
}
