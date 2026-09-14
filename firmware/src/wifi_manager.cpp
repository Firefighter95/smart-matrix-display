#include "wifi_manager.h"
#include <WiFi.h>
#include <ESPmDNS.h>

void WifiManager::begin(ConfigManager& config) {
  ssid_ = config.wifiSsid();
  password_ = config.wifiPassword();
  hostname_ = config.hostname();
  if (hostname_.isEmpty()) hostname_ = "smartmatrix";
  apSsid_ = "SmartMatrix-" + String(static_cast<uint32_t>(ESP.getEfuseMac() & 0xFFFF), HEX);
  apSsid_.toUpperCase();
  if (ssid_.isEmpty()) startAccessPoint();
  else startStation();
}

void WifiManager::update() {
  if (connected()) {
    // The fallback AP is only needed while the configured station network is
    // unavailable.  Once STA reconnects, explicitly tear it down; otherwise
    // WIFI_AP_STA keeps the provisioning network visible indefinitely.
    if (apMode_) {
      WiFi.softAPdisconnect(true);
      WiFi.mode(WIFI_STA);
      apMode_ = false;
    }
    ensureMdns();
    return;
  }
  if (!ssid_.isEmpty() && millis() > retryAt_) {
    WiFi.begin(ssid_.c_str(), password_.c_str());
    retryAt_ = millis() + 10000;
  }
  if (!apMode_ && !ssid_.isEmpty() && millis() > fallbackAt_) startAccessPoint();
}

bool WifiManager::connected() const { return WiFi.status() == WL_CONNECTED; }
int32_t WifiManager::rssi() const { return connected() ? WiFi.RSSI() : -127; }
String WifiManager::ip() const {
  if (connected()) return WiFi.localIP().toString();
  if (apMode_) return WiFi.softAPIP().toString();
  return String();
}

void WifiManager::configure(const String& ssid, const String& password, const String& hostname) {
  ssid_ = ssid;
  password_ = password;
  hostname_ = hostname.isEmpty() ? "smartmatrix" : hostname;
  WiFi.disconnect(true, true);
  apMode_ = false;
  mdnsStarted_ = false;
  if (ssid_.isEmpty()) startAccessPoint();
  else startStation();
}

void WifiManager::startStation() {
  apMode_ = false;
  WiFi.mode(WIFI_STA);
  WiFi.setHostname(hostname_.c_str());
  WiFi.begin(ssid_.c_str(), password_.c_str());
  retryAt_ = millis() + 10000;
  fallbackAt_ = millis() + 30000;
}

void WifiManager::startAccessPoint() {
  apMode_ = true;
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(apSsid_.c_str());
}

void WifiManager::ensureMdns() {
  if (mdnsStarted_) return;
  mdnsStarted_ = MDNS.begin(hostname_.c_str());
  if (mdnsStarted_) MDNS.addService("http", "tcp", 80);
}
