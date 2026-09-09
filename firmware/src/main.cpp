#include <Arduino.h>
#include <LittleFS.h>

#include "api_server.h"
#include "brightness_manager.h"
#include "clock_screen.h"
#include "config_manager.h"
#include "display_manager.h"
#include "log_manager.h"
#include "message_screen.h"
#include "ota_manager.h"
#include "time_manager.h"
#include "wifi_manager.h"

ConfigManager configManager;
LogManager logManager;
DisplayManager displayManager;
WifiManager wifiManager;
TimeManager timeManager;
BrightnessManager brightnessManager;
ClockScreen clockScreen;
MessageScreen messageScreen;
OtaManager otaManager;
ApiServer apiServer(configManager, displayManager, logManager, wifiManager, timeManager);

void setup() {
  Serial.begin(115200);
  delay(200);
  logManager.begin();
  logManager.add(LogCategory::SYSTEM, LogLevel::INFO, "Smart Matrix Display boot");
  configManager.begin();
  wifiManager.begin();
  timeManager.begin();
  brightnessManager.begin();
  clockScreen.begin();
  messageScreen.begin();
  if (displayManager.begin()) logManager.add(LogCategory::DISPLAY_LOG, LogLevel::INFO, "HUB75 DMA test gestart");
  else logManager.add(LogCategory::DISPLAY_LOG, LogLevel::ERROR, "HUB75 DMA initialisatie mislukt");
  // Web/API and OTA are intentionally available as scaffolding, but the physical test does not depend on them.
  otaManager.begin();
  apiServer.begin();
}

void loop() {
  displayManager.update();
  wifiManager.update();
  timeManager.update();
  brightnessManager.update();
  clockScreen.update();
  messageScreen.update();
  otaManager.update();
  apiServer.update();
  delay(1);
}
