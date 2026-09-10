#include "system_status.h"

String SystemStatus::json(bool online, int32_t rssi, bool synced, bool displayEnabled, const String& mode, const String& ip, const String& hostname) const {
  char deviceId[17];
  snprintf(deviceId, sizeof(deviceId), "%llX", static_cast<unsigned long long>(ESP.getEfuseMac()));
  String result = "{\"online\":" + String(online ? "true" : "false");
  result += ",\"device_id\":\"" + String(deviceId) + "\"";
  result += ",\"mode\":\"" + mode + "\"";
  result += ",\"brightness\":25";
  result += ",\"wifi_rssi\":" + String(rssi);
  result += ",\"uptime\":" + String(millis() / 1000);
  result += ",\"time_synced\":" + String(synced ? "true" : "false");
  result += ",\"firmware\":\"1.4.0-dev\",\"resolution\":\"128x64\"";
  result += ",\"ip\":\"" + ip + "\",\"hostname\":\"" + hostname + "\"";
  result += ",\"heap_free\":" + String(ESP.getFreeHeap());
  result += ",\"psram_free\":" + String(ESP.getFreePsram());
  result += ",\"display_enabled\":" + String(displayEnabled ? "true" : "false") + "}";
  return result;
}
