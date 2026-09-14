#include "api_server.h"
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <Update.h>
#include <cstdlib>
#include <cstring>

namespace {
constexpr size_t MAX_JSON_BODY = 8192;

void collectJsonBody(AsyncWebServerRequest* request, uint8_t* data, size_t len, size_t index, size_t total) {
  if (total == 0 || total > MAX_JSON_BODY || index + len > total) {
    request->abort();
    return;
  }
  if (index == 0) {
    request->_tempObject = calloc(total + 1, sizeof(char));
  }
  if (request->_tempObject == nullptr) {
    request->abort();
    return;
  }
  memcpy(static_cast<char*>(request->_tempObject) + index, data, len);
  static_cast<char*>(request->_tempObject)[index + len] = '\0';
}

bool parseJsonBody(AsyncWebServerRequest* request, JsonDocument& document) {
  if (request->_tempObject == nullptr) return false;
  const DeserializationError error = deserializeJson(document, static_cast<const char*>(request->_tempObject));
  free(request->_tempObject);
  request->_tempObject = nullptr;
  return !error && document.is<JsonObject>();
}
} // namespace

ApiServer::ApiServer(ConfigManager& config, DisplayManager& display, LogManager& logs, WifiManager& wifi, TimeManager& time, WeatherScreen& weather)
  : config_(config), display_(display), logs_(logs), wifi_(wifi), time_(time), weather_(weather) {}

void ApiServer::begin() {
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  server_.on("/api/v1/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
    request->send(200, "application/json", status_.json(wifi_.networkReady(), wifi_.rssi(), time_.synced(), display_.mode() != DisplayMode::OFF, display_.modeName(), wifi_.ip(), wifi_.hostname(), display_.brightness(), weather_.snapshotJson()));
  });
  server_.on("/api/v1/wifi", HTTP_GET, [this](AsyncWebServerRequest* request) {
    JsonDocument response;
    response["connected"] = wifi_.connected();
    response["ap_mode"] = wifi_.apMode();
    response["ap_ssid"] = wifi_.apSsid();
    response["ssid"] = config_.wifiSsid();
    response["ip"] = wifi_.ip();
    response["hostname"] = wifi_.hostname();
    String body;
    serializeJson(response, body);
    request->send(200, "application/json", body);
  });
  server_.on("/api/v1/wifi", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["ssid"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_WIFI\",\"message\":\"ssid is verplicht.\"}}");
      return;
    }
    const String ssid = document["ssid"].as<String>();
    const String password = document["password"] | "";
    const String hostname = document["hostname"] | "smartmatrix";
    if (!config_.saveWifi(ssid, password, hostname)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_WIFI\",\"message\":\"WiFi-velden zijn te lang.\"}}");
      return;
    }
    wifi_.configure(ssid, password, hostname);
    logs_.add(LogCategory::WIFI, LogLevel::INFO, "WiFi-configuratie opgeslagen");
    request->send(202, "application/json", "{\"ok\":true,\"reconnecting\":true}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/config", HTTP_GET, [this](AsyncWebServerRequest* request) { request->send(200, "application/json", config_.json()); });
  server_.on("/api/v1/config", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_CONFIG\",\"message\":\"Config moet een geldig JSON-object zijn.\"}}");
      return;
    }
    String body;
    serializeJson(document, body);
    if (!config_.saveJson(body)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_CONFIG\",\"message\":\"Config moet een geldig JSON-object zijn.\"}}");
      return;
    }
    JsonDocument saved;
    deserializeJson(saved, config_.json());
    const uint8_t requested = saved["display"]["brightness"] | 25;
    const uint8_t maximum = saved["display"]["maxBrightness"] | 100;
    display_.setBrightness(min(requested, maximum));
    display_.setMode((saved["display"]["enabled"] | true) ? DisplayMode::CLOCK : DisplayMode::OFF);
    logs_.add(LogCategory::CONFIG, LogLevel::INFO, "Configuratie opgeslagen");
    request->send(200, "application/json", config_.json());
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/message", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["message"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_MESSAGE\",\"message\":\"message is verplicht.\"}}");
      return;
    }
    display_.setMode(DisplayMode::MESSAGE);
    logs_.add(LogCategory::API, LogLevel::INFO, "Message event ontvangen");
    String body;
    serializeJson(document, body);
    request->send(200, "application/json", body);
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/events", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["source"].is<const char*>() || !document["type"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_EVENT\",\"message\":\"source en type zijn verplicht.\"}}");
      return;
    }
    display_.setMode(DisplayMode::MESSAGE);
    logs_.add(LogCategory::EVENT, LogLevel::INFO, "Structured event ontvangen");
    String body;
    serializeJson(document, body);
    request->send(202, "application/json", body);
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/weather", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["temperatureC"].is<float>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_WEATHER\",\"message\":\"temperatureC is verplicht.\"}}");
      return;
    }
    String weatherBody;
    serializeJson(document, weatherBody);
    if (!weather_.setSnapshot(weatherBody)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_WEATHER\",\"message\":\"Weather snapshot is ongeldig.\"}}");
      return;
    }
    // A builder clock consumes the same snapshot as live weather data. Do not
    // replace the selected builder layout with the legacy full-screen weather
    // mode; keep that mode available for installations that explicitly use it.
    JsonDocument configDocument;
    deserializeJson(configDocument, config_.json());
    const char* clockLayout = configDocument["clock"]["layout"] | "minimal";
    const bool builderLayout = clockLayout != nullptr && strcmp(clockLayout, "builder") == 0;
    if (!builderLayout) display_.setMode(DisplayMode::WEATHER);
    logs_.add(LogCategory::WEATHER, LogLevel::INFO, "Weather snapshot ontvangen");
    request->send(200, "application/json", weatherBody);
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/weather", HTTP_GET, [this](AsyncWebServerRequest* request) {
    request->send(200, "application/json", weather_.hasSnapshot() ? weather_.snapshotJson() : "{\"available\":false}");
  });
  server_.on("/api/v1/brightness", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_JSON\",\"message\":\"Body moet geldig JSON zijn.\"}}");
      return;
    }
    const int brightness = document["brightness"] | -1;
    if (brightness < 0 || brightness > 100) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_BRIGHTNESS\",\"message\":\"brightness moet 0..100 zijn.\"}}");
      return;
    }
    display_.setBrightness(static_cast<uint8_t>(brightness));
    JsonDocument patch;
    patch["display"]["brightness"] = brightness;
    String configBody;
    serializeJson(patch, configBody);
    config_.saveJson(configBody);
    logs_.add(LogCategory::DISPLAY_LOG, LogLevel::INFO, "Brightness gewijzigd");
    request->send(200, "application/json", "{\"ok\":true}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/power", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_JSON\",\"message\":\"Body moet geldig JSON zijn.\"}}");
      return;
    }
    const bool enabled = document["enabled"] | false;
    display_.setMode(enabled ? DisplayMode::CLOCK : DisplayMode::OFF);
    request->send(200, "application/json", enabled ? "{\"ok\":true,\"enabled\":true}" : "{\"ok\":true,\"enabled\":false}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/events/skip", HTTP_POST, [this](AsyncWebServerRequest* request) {
    display_.setMode(DisplayMode::CLOCK);
    logs_.add(LogCategory::QUEUE, LogLevel::INFO, "Event overgeslagen");
    request->send(200, "application/json", "{\"ok\":true}");
  });
  server_.on("/api/v1/events/history", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(200, "application/json", "[]"); });
  server_.on("/api/v1/diagnostics", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(200, "application/json", "{\"queueLength\":0,\"apiRequests\":0,\"errors\":0}"); });
  server_.on("/api/v1/clear", HTTP_POST, [this](AsyncWebServerRequest* request) {
    display_.setMode(DisplayMode::CLOCK);
    logs_.add(LogCategory::API, LogLevel::INFO, "Display gewist");
    request->send(200, "application/json", "{\"ok\":true}");
  });
  server_.on("/api/v1/logs", HTTP_GET, [this](AsyncWebServerRequest* request) { request->send(200, "application/json", logs_.toJson()); });
  server_.on("/api/v1/restart", HTTP_POST, [this](AsyncWebServerRequest* request) { request->send(202, "application/json", "{\"ok\":true,\"restarting\":true}"); });
  server_.on("/api/v1/ota/firmware", HTTP_POST, [this](AsyncWebServerRequest* request) {
    if (Update.hasError()) {
      request->send(500, "application/json", "{\"ok\":false,\"error\":{\"code\":\"OTA_FAILED\",\"message\":\"Firmware-update mislukt.\"}}");
      return;
    }
    request->send(200, "application/json", "{\"ok\":true,\"restarting\":true,\"target\":\"firmware\"}");
    otaRestartAt_ = millis() + 1000;
  }, [](AsyncWebServerRequest* request, const String& filename, size_t index, uint8_t* data, size_t len, bool final) {
    if (index == 0) {
      const uint32_t maxSketchSpace = (ESP.getFreeSketchSpace() - 0x1000) & 0xFFFFF000;
      if (!Update.begin(maxSketchSpace, U_FLASH)) Update.printError(Serial);
    }
    if (len && Update.write(data, len) != len) Update.printError(Serial);
    if (final && !Update.end(true)) Update.printError(Serial);
    (void)request;
    (void)filename;
  });
  server_.on("/api/v1/ota/filesystem", HTTP_POST, [this](AsyncWebServerRequest* request) {
    if (Update.hasError()) {
      request->send(500, "application/json", "{\"ok\":false,\"error\":{\"code\":\"OTA_FAILED\",\"message\":\"LittleFS-update mislukt.\"}}");
      return;
    }
    request->send(200, "application/json", "{\"ok\":true,\"restarting\":true,\"target\":\"filesystem\"}");
    otaRestartAt_ = millis() + 1000;
  }, [](AsyncWebServerRequest* request, const String& filename, size_t index, uint8_t* data, size_t len, bool final) {
    if (index == 0) {
      if (!Update.begin(LittleFS.totalBytes(), U_SPIFFS)) Update.printError(Serial);
    }
    if (len && Update.write(data, len) != len) Update.printError(Serial);
    if (final && !Update.end(true)) Update.printError(Serial);
    (void)request;
    (void)filename;
  });
  if (LittleFS.begin(false)) server_.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  else server_.on("/", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(503, "text/plain", "LittleFS portal niet beschikbaar"); });
  server_.begin();
}

void ApiServer::update() {
  if (otaRestartAt_ != 0 && static_cast<int32_t>(millis() - otaRestartAt_) >= 0) {
    otaRestartAt_ = 0;
    ESP.restart();
  }
}
