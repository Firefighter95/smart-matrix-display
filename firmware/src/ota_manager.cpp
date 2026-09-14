#include "ota_manager.h"
#include <ArduinoOTA.h>
#include <WiFi.h>

void OtaManager::begin(const String& hostname) {
  hostname_ = hostname.isEmpty() ? "smartmatrix" : hostname;
  started_ = false;
}

void OtaManager::update() {
  if (!started_) {
    if (WiFi.status() != WL_CONNECTED) return;
    ArduinoOTA.setHostname(hostname_.c_str());
    // WifiManager owns the mDNS responder already. Avoid reinitializing it
    // from ArduinoOTA; the OTA UDP listener itself remains enabled.
    ArduinoOTA.setMdnsEnabled(false);
    ArduinoOTA.begin();
    started_ = true;
  }
  ArduinoOTA.handle();
}
