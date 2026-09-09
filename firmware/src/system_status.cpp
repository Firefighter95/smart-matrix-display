#include "system_status.h"

String SystemStatus::json(bool online, int32_t rssi, bool synced, bool displayEnabled, const String& mode) const {
  String result = "{\"online\":" + String(online ? "true" : "false");
  result += ",\"mode\":\"" + mode + "\"";
  result += ",\"brightness\":25";
  result += ",\"wifi_rssi\":" + String(rssi);
  result += ",\"uptime\":" + String(millis() / 1000);
  result += ",\"time_synced\":" + String(synced ? "true" : "false");
  result += ",\"firmware\":\"1.0.0-dev\",\"resolution\":\"128x64\"";
  result += ",\"ip\":\"\",\"hostname\":\"smartmatrix\"";
  result += ",\"heap_free\":" + String(ESP.getFreeHeap());
  result += ",\"psram_free\":" + String(ESP.getFreePsram());
  result += ",\"display_enabled\":" + String(displayEnabled ? "true" : "false") + "}";
  return result;
}

