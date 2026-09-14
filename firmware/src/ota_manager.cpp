#include "ota_manager.h"
#include <ArduinoOTA.h>

void OtaManager::begin(const String& hostname) {
  ArduinoOTA.setHostname(hostname.c_str());
  ArduinoOTA.begin();
}

void OtaManager::update() { ArduinoOTA.handle(); }
