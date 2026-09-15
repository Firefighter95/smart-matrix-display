#pragma once

#include <Arduino.h>
#include <ESPAsyncWebServer.h>
#include "config_manager.h"
#include "audio_manager.h"
#include "display_manager.h"
#include "log_manager.h"
#include "system_status.h"
#include "wifi_manager.h"
#include "time_manager.h"
#include "weather_screen.h"

class ApiServer {
public:
  ApiServer(ConfigManager& config, AudioManager& audio, DisplayManager& display, LogManager& logs, WifiManager& wifi, TimeManager& time, WeatherScreen& weather);
  void begin();
  void update();

private:
  AsyncWebServer server_{80};
  ConfigManager& config_;
  AudioManager& audio_;
  DisplayManager& display_;
  LogManager& logs_;
  WifiManager& wifi_;
  TimeManager& time_;
  WeatherScreen& weather_;
  SystemStatus status_;
  uint32_t otaRestartAt_ = 0;
};
