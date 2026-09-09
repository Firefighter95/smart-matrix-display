#include "ota_manager.h"
#include <ArduinoOTA.h>

void OtaManager::begin() { ArduinoOTA.begin(); }
void OtaManager::update() { ArduinoOTA.handle(); }

