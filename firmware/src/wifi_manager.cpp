#include "wifi_manager.h"
#include <WiFi.h>

void WifiManager::begin() {
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname_.c_str());
}

void WifiManager::update() {
  // Credentials are intentionally not compiled into V1. Provisioning will be added to the portal.
  if (WiFi.status() != WL_CONNECTED && millis() > retryAt_) retryAt_ = millis() + 10000;
}

bool WifiManager::connected() const { return WiFi.status() == WL_CONNECTED; }
int32_t WifiManager::rssi() const { return connected() ? WiFi.RSSI() : -127; }
String WifiManager::ip() const { return connected() ? WiFi.localIP().toString() : String(); }

