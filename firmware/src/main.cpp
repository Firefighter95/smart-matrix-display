#include <Arduino.h>
#include <LittleFS.h>
#include <ArduinoJson.h>

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
#include "weather_screen.h"
#ifdef SMART_MATRIX_HARDWARE_VALIDATION
#include "hardware_validation.h"
#endif
#ifdef SMART_MATRIX_RAW_SIGNAL_TEST
#include "raw_signal_test.h"
#endif

ConfigManager configManager;
LogManager logManager;
DisplayManager displayManager;
WifiManager wifiManager;
TimeManager timeManager;
WeatherScreen weatherScreen(displayManager, timeManager, configManager);
BrightnessManager brightnessManager;
ClockScreen clockScreen(displayManager, timeManager, wifiManager, configManager);
MessageScreen messageScreen;
OtaManager otaManager;
ApiServer apiServer(configManager, displayManager, logManager, wifiManager, timeManager, weatherScreen);
#ifdef SMART_MATRIX_HARDWARE_VALIDATION
HardwareValidation hardwareValidation;
#endif

namespace {
void applyStoredDisplayConfig() {
  JsonDocument document;
  if (deserializeJson(document, configManager.json()) != DeserializationError::Ok) return;
  const uint8_t requested = document["display"]["brightness"] | 25;
  const uint8_t maximum = document["display"]["maxBrightness"] | 100;
  displayManager.setBrightness(min(requested, maximum));
  if (!(document["display"]["enabled"] | true)) displayManager.setMode(DisplayMode::OFF);
}
}

void setup() {
  Serial.begin(115200);
  delay(200);
#ifdef SMART_MATRIX_RAW_SIGNAL_TEST
  rawSignalTestSetup();
  return;
#endif
  logManager.begin();
  logManager.add(LogCategory::SYSTEM, LogLevel::INFO, "Smart Matrix Display boot");
  configManager.begin();
#ifdef SMART_MATRIX_HARDWARE_VALIDATION
  if (displayManager.begin()) {
    displayManager.setBrightness(HardwareConfig::VALIDATION_BRIGHTNESS);
    hardwareValidation.begin(displayManager.output());
  } else {
    Serial.println("[ERROR] HUB75 initialization failed; validation stopped safely.");
  }
  return;
#else
  wifiManager.begin(configManager);
  timeManager.begin();
  weatherScreen.begin();
  brightnessManager.begin();
  messageScreen.begin();
  if (displayManager.begin()) {
    applyStoredDisplayConfig();
    logManager.add(LogCategory::DISPLAY_LOG, LogLevel::INFO, "HUB75 productieklok gestart");
  }
  else logManager.add(LogCategory::DISPLAY_LOG, LogLevel::ERROR, "HUB75 DMA initialisatie mislukt");
  clockScreen.begin();
  // Web/API and OTA are intentionally available as scaffolding, but the physical test does not depend on them.
  otaManager.begin(wifiManager.hostname());
  apiServer.begin();
#endif
}

void loop() {
#ifdef SMART_MATRIX_RAW_SIGNAL_TEST
  rawSignalTestLoop();
#elif defined(SMART_MATRIX_HARDWARE_VALIDATION)
  hardwareValidation.update();
#else
  displayManager.update();
  wifiManager.update();
  timeManager.update();
  brightnessManager.update();
  clockScreen.update();
  weatherScreen.update();
  messageScreen.update();
  otaManager.update();
  apiServer.update();
  delay(1);
#endif
}
