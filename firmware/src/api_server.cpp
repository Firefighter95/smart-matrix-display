#include "api_server.h"
#include <LittleFS.h>

ApiServer::ApiServer(ConfigManager& config, DisplayManager& display, LogManager& logs, WifiManager& wifi, TimeManager& time)
  : config_(config), display_(display), logs_(logs), wifi_(wifi), time_(time) {}

void ApiServer::begin() {
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  server_.on("/api/v1/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
    request->send(200, "application/json", status_.json(wifi_.connected(), wifi_.rssi(), time_.synced(), display_.mode() != DisplayMode::OFF, display_.modeName(), wifi_.ip(), wifi_.hostname()));
  });
  server_.on("/api/v1/config", HTTP_GET, [this](AsyncWebServerRequest* request) { request->send(200, "application/json", config_.json()); });
  server_.on("/api/v1/config", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    request->send(501, "application/json", "{\"ok\":false,\"error\":{\"code\":\"BODY_HANDLER_PENDING\",\"message\":\"Config PUT wordt in de productie-fase geactiveerd.\"}}");
  });
  server_.on("/api/v1/message", HTTP_POST, [this](AsyncWebServerRequest* request) {
    request->send(501, "application/json", "{\"ok\":false,\"error\":{\"code\":\"BODY_HANDLER_PENDING\",\"message\":\"Message POST wordt in de productie-fase geactiveerd.\"}}");
  });
  server_.on("/api/v1/clear", HTTP_POST, [this](AsyncWebServerRequest* request) {
    display_.setMode(DisplayMode::CLOCK);
    logs_.add(LogCategory::API, LogLevel::INFO, "Display gewist");
    request->send(200, "application/json", "{\"ok\":true}");
  });
  server_.on("/api/v1/logs", HTTP_GET, [this](AsyncWebServerRequest* request) { request->send(200, "application/json", logs_.toJson()); });
  server_.on("/api/v1/restart", HTTP_POST, [this](AsyncWebServerRequest* request) { request->send(202, "application/json", "{\"ok\":true,\"restarting\":true}"); });
  if (LittleFS.begin(false)) server_.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  else server_.on("/", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(503, "text/plain", "LittleFS portal niet beschikbaar"); });
  server_.begin();
}

void ApiServer::update() {}
