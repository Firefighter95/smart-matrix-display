#pragma once

#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include "config_manager.h"
#include "display_manager.h"
#include "log_manager.h"
#include "system_status.h"
#include "wifi_manager.h"
#include "time_manager.h"

class ApiServer {
public:
  ApiServer(ConfigManager& config, DisplayManager& display, LogManager& logs, WifiManager& wifi, TimeManager& time);
  void begin();
  void update();

private:
  AsyncWebServer server_{80};
  ConfigManager& config_;
  DisplayManager& display_;
  LogManager& logs_;
  WifiManager& wifi_;
  TimeManager& time_;
  SystemStatus status_;
};

