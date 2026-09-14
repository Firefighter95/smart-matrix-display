#pragma once

#include <Arduino.h>
#include "config_manager.h"

class WifiManager {
public:
  void begin(ConfigManager& config);
  void update();
  void configure(const String& ssid, const String& password, const String& hostname);
  bool connected() const;
  bool networkReady() const { return connected() || apMode_; }
  bool apMode() const { return apMode_; }
  int32_t rssi() const;
  String ip() const;
  const String& hostname() const { return hostname_; }
  const String& apSsid() const { return apSsid_; }

private:
  void startAccessPoint();
  void startStation();
  void ensureMdns();
  String ssid_;
  String password_;
  String hostname_ = "smartmatrix";
  String apSsid_;
  uint32_t retryAt_ = 0;
  uint32_t fallbackAt_ = 0;
  bool apMode_ = false;
  bool mdnsStarted_ = false;
};
