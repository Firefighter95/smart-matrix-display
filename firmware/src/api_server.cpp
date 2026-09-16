#include "api_server.h"
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <Update.h>
#include <esp_partition.h>
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

ApiServer::ApiServer(ConfigManager& config, AudioManager& audio, DisplayManager& display, LogManager& logs, WifiManager& wifi, TimeManager& time, WeatherScreen& weather, MessageScreen& message)
  : config_(config), audio_(audio), display_(display), logs_(logs), wifi_(wifi), time_(time), weather_(weather), message_(message) {}

void ApiServer::begin() {
  DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  server_.on("/api/v1/status", HTTP_GET, [this](AsyncWebServerRequest* request) {
    String body = status_.json(wifi_.networkReady(), wifi_.rssi(), time_.synced(), display_.mode() != DisplayMode::OFF, display_.modeName(), wifi_.ip(), wifi_.hostname(), display_.brightness(), weather_.snapshotJson());
    JsonDocument response;
    JsonDocument configDocument;
    deserializeJson(response, body);
    deserializeJson(configDocument, config_.json());
    response["active_layout"] = configDocument["activeLayoutId"] | configDocument["clock"]["layout"] | "builder";
    response["profile"] = configDocument["activeProfileId"] | "normal";
    response["queue_length"] = 0;
    body = "";
    serializeJson(response, body);
    request->send(200, "application/json", body);
  });
  server_.on("/api/v1/audio", HTTP_GET, [this](AsyncWebServerRequest* request) {
    request->send(200, "application/json", audio_.json());
  });
  server_.on("/api/v1/audio/assist/start", HTTP_POST, [this](AsyncWebServerRequest* request) {
    if (!audio_.startAssist()) {
      request->send(503, "application/json", "{\"ok\":false,\"error\":{\"code\":\"AUDIO_NOT_READY\",\"message\":\"Microfooncapture is niet beschikbaar.\"}}");
      return;
    }
    request->send(202, "application/json", "{\"ok\":true,\"state\":\"LISTENING\",\"mode\":\"hardware_test\"}");
  });
  server_.on("/api/v1/audio/assist/stop", HTTP_POST, [this](AsyncWebServerRequest* request) {
    audio_.stopAssist();
    request->send(200, "application/json", "{\"ok\":true,\"state\":\"IDLE\"}");
  });
  server_.on("/api/v1/audio/test", HTTP_POST, [this](AsyncWebServerRequest* request) {
    if (!audio_.speakerTest()) {
      request->send(503, "application/json", "{\"ok\":false,\"error\":{\"code\":\"AUDIO_NOT_READY\",\"message\":\"Speaker-test is niet beschikbaar.\"}}");
      return;
    }
    request->send(202, "application/json", "{\"ok\":true,\"test\":\"440Hz\"}");
  });
  server_.on("/api/v1/audio/playback/stop", HTTP_POST, [this](AsyncWebServerRequest* request) {
    audio_.stopPlayback();
    request->send(200, "application/json", "{\"ok\":true,\"state\":\"IDLE\"}");
  });
  server_.on("/api/v1/audio/play-url", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["url"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_AUDIO_URL\",\"message\":\"url is verplicht.\"}}");
      return;
    }
    const String url = document["url"].as<String>();
    const String contentType = document["contentType"] | "audio/mpeg";
    if (!audio_.playUrl(url, contentType)) {
      request->send(503, "application/json", "{\"ok\":false,\"error\":{\"code\":\"AUDIO_PLAYBACK_FAILED\",\"message\":\"Audio kon niet worden afgespeeld.\"}}");
      return;
    }
    request->send(202, "application/json", "{\"ok\":true,\"state\":\"RESPONDING\"}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/audio/volume", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["volume"].is<int>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_VOLUME\",\"message\":\"volume moet een getal van 0 tot 100 zijn.\"}}");
      return;
    }
    const int requested = document["volume"].as<int>();
    if (requested < 0 || requested > 100 || !audio_.setVolume(static_cast<uint8_t>(requested))) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_VOLUME\",\"message\":\"volume moet tussen 0 en 100 liggen.\"}}");
      return;
    }
    logs_.add(LogCategory::HOME_ASSISTANT, LogLevel::INFO, String("Speakervolume ingesteld op ") + requested + "%");
    request->send(200, "application/json", audio_.json());
  }, nullptr, collectJsonBody);
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
    if (!message_.active()) display_.setMode((saved["display"]["enabled"] | true) ? DisplayMode::CLOCK : DisplayMode::OFF);
    logs_.add(LogCategory::CONFIG, LogLevel::INFO, "Configuratie opgeslagen");
    request->send(200, "application/json", config_.json());
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/layouts", HTTP_GET, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (deserializeJson(document, config_.json()) != DeserializationError::Ok || !document["layouts"].is<JsonArray>()) {
      request->send(200, "application/json", "[]");
      return;
    }
    String body;
    serializeJson(document["layouts"], body);
    request->send(200, "application/json", body);
  });
  server_.on(AsyncURIMatcher::prefix("/api/v1/layouts/"), HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument layout;
    if (!parseJsonBody(request, layout) || !layout["id"].is<const char*>() || !layout["elements"].is<JsonArray>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"Layout moet id en elements bevatten.\"}}");
      return;
    }
    const String pathPrefix = "/api/v1/layouts/";
    const String pathId = request->url().substring(pathPrefix.length());
    const String layoutId = layout["id"].as<String>();
    const int layoutWidth = layout["width"] | 0;
    const int layoutHeight = layout["height"] | 0;
    if (pathId.isEmpty() || pathId != layoutId || layoutWidth != 128 || layoutHeight != 64) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"Layout-id of afmetingen zijn ongeldig.\"}}");
      return;
    }
    String layoutJson;
    serializeJson(layout, layoutJson);
    if (!config_.saveLayout(layoutJson)) {
      request->send(500, "application/json", "{\"ok\":false,\"error\":{\"code\":\"CONFIG_ERROR\",\"message\":\"Layout kon niet worden opgeslagen.\"}}");
      return;
    }
    logs_.add(LogCategory::BUILDER, LogLevel::INFO, String("Layout opgeslagen: ") + layoutId);
    String response;
    serializeJson(layout, response);
    request->send(200, "application/json", response);
  }, nullptr, collectJsonBody);
  server_.on(AsyncURIMatcher::prefix("/api/v1/layouts/"), HTTP_DELETE, [this](AsyncWebServerRequest* request) {
    const String pathPrefix = "/api/v1/layouts/";
    const String layoutId = request->url().substring(pathPrefix.length());
    JsonDocument document;
    if (layoutId.isEmpty() || deserializeJson(document, config_.json()) != DeserializationError::Ok) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"Layout-id is ongeldig.\"}}");
      return;
    }
    JsonArray layouts = document["layouts"].as<JsonArray>();
    for (size_t index = 0; index < layouts.size(); ++index) {
      if (String(layouts[index]["id"] | "") == layoutId) layouts.remove(index--);
    }
    String fullConfig;
    serializeJson(document, fullConfig);
    if (!config_.saveJson(fullConfig)) {
      request->send(500, "application/json", "{\"ok\":false,\"error\":{\"code\":\"CONFIG_ERROR\",\"message\":\"Layout kon niet worden verwijderd.\"}}");
      return;
    }
    request->send(200, "application/json", "{\"ok\":true}");
  });
  server_.on("/api/v1/layout", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["layout_id"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"layout_id is verplicht.\"}}");
      return;
    }
    JsonDocument patch;
    patch["activeLayoutId"] = document["layout_id"].as<String>();
    String patchBody;
    serializeJson(patch, patchBody);
    if (!config_.saveJson(patchBody)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"Layout kon niet worden opgeslagen.\"}}");
      return;
    }
    display_.setMode(DisplayMode::CLOCK);
    logs_.add(LogCategory::CONFIG, LogLevel::INFO, "Actieve layout gewijzigd");
    request->send(200, "application/json", "{\"ok\":true}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/profile", HTTP_PUT, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["profile_id"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_PROFILE\",\"message\":\"profile_id is verplicht.\"}}");
      return;
    }
    JsonDocument patch;
    patch["activeProfileId"] = document["profile_id"].as<String>();
    String patchBody;
    serializeJson(patch, patchBody);
    if (!config_.saveJson(patchBody)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_PROFILE\",\"message\":\"Profiel kon niet worden opgeslagen.\"}}");
      return;
    }
    logs_.add(LogCategory::CONFIG, LogLevel::INFO, "Actief profiel gewijzigd");
    request->send(200, "application/json", "{\"ok\":true}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/layouts/show", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["layout_id"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"layout_id is verplicht.\"}}");
      return;
    }
    JsonDocument patch;
    patch["activeLayoutId"] = document["layout_id"].as<String>();
    String patchBody;
    serializeJson(patch, patchBody);
    if (!config_.saveJson(patchBody)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_LAYOUT\",\"message\":\"Layout kon niet worden opgeslagen.\"}}");
      return;
    }
    display_.setMode(DisplayMode::CLOCK);
    logs_.add(LogCategory::EVENT, LogLevel::INFO, "Layout-event ontvangen");
    request->send(202, "application/json", "{\"ok\":true,\"accepted\":true}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/message", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["message"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_MESSAGE\",\"message\":\"message is verplicht.\"}}");
      return;
    }
    String body;
    serializeJson(document, body);
    if (!message_.showMessage(body)) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_MESSAGE\",\"message\":\"Bericht kon niet worden gestart.\"}}");
      return;
    }
    logs_.add(LogCategory::API, LogLevel::INFO, "Message event ontvangen");
    request->send(202, "application/json", body);
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/events", HTTP_POST, [this](AsyncWebServerRequest* request) {
    JsonDocument document;
    if (!parseJsonBody(request, document) || !document["source"].is<const char*>() || !document["type"].is<const char*>()) {
      request->send(400, "application/json", "{\"ok\":false,\"error\":{\"code\":\"INVALID_EVENT\",\"message\":\"source en type zijn verplicht.\"}}");
      return;
    }
    String body;
    serializeJson(document, body);
    if (!message_.showEvent(body)) {
      request->send(409, "application/json", "{\"ok\":false,\"error\":{\"code\":\"EVENT_REJECTED\",\"message\":\"Event heeft een lagere prioriteit dan de actieve melding.\"}}");
      return;
    }
    logs_.add(LogCategory::EVENT, LogLevel::INFO, "Structured event ontvangen");
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
    // ConfigManager stores normalized compact JSON. Keep the mode decision
    // independent from the temporary ArduinoJson document so a large portal
    // configuration cannot make this route fall back to WEATHER accidentally.
    const String configJson = config_.json();
    const bool builderLayout = configJson.indexOf("\"layout\":\"builder\"") >= 0;
    if (!builderLayout) display_.setMode(DisplayMode::WEATHER);
    logs_.add(LogCategory::WEATHER, LogLevel::INFO,
              builderLayout ? "Weather snapshot voor builder opgeslagen" : "Weather snapshot ontvangen");
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
    JsonDocument patch;
    patch["display"]["enabled"] = enabled;
    String configBody;
    serializeJson(patch, configBody);
    config_.saveJson(configBody);
    request->send(200, "application/json", enabled ? "{\"ok\":true,\"enabled\":true}" : "{\"ok\":true,\"enabled\":false}");
  }, nullptr, collectJsonBody);
  server_.on("/api/v1/events/skip", HTTP_POST, [this](AsyncWebServerRequest* request) {
    message_.clear();
    logs_.add(LogCategory::QUEUE, LogLevel::INFO, "Event overgeslagen");
    request->send(200, "application/json", "{\"ok\":true}");
  });
  server_.on("/api/v1/events/history", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(200, "application/json", "[]"); });
  server_.on("/api/v1/diagnostics", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(200, "application/json", "{\"queueLength\":0,\"apiRequests\":0,\"errors\":0}"); });
  server_.on("/api/v1/clear", HTTP_POST, [this](AsyncWebServerRequest* request) {
    message_.clear();
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
      String body = "{\"ok\":false,\"error\":{\"code\":\"OTA_FAILED\",\"message\":\"LittleFS-update mislukt.\",\"updateCode\":" + String(Update.getError()) + "},\"partitionBytes\":" + String(LittleFS.totalBytes()) + "}";
      request->send(500, "application/json", body);
      return;
    }
    request->send(200, "application/json", "{\"ok\":true,\"restarting\":true,\"target\":\"filesystem\"}");
    otaRestartAt_ = millis() + 1000;
  }, [](AsyncWebServerRequest* request, const String& filename, size_t index, uint8_t* data, size_t len, bool final) {
    if (index == 0) {
      // Do not write a new image while LittleFS still has the old partition
      // mounted; cached filesystem metadata can otherwise corrupt the update.
      LittleFS.end();
      // Use the actual data partition size. LittleFS.totalBytes() can be zero
      // after LittleFS.end(), while an unknown Update size can leave a full
      // image upload without a valid filesystem after reboot.
      const esp_partition_t* partition = esp_partition_find_first(
          ESP_PARTITION_TYPE_DATA, ESP_PARTITION_SUBTYPE_DATA_SPIFFS, nullptr);
      const size_t partitionSize = partition ? partition->size : UPDATE_SIZE_UNKNOWN;
      if (!Update.begin(partitionSize, U_SPIFFS)) Update.printError(Serial);
    }
    if (len && Update.write(data, len) != len) Update.printError(Serial);
    if (final && !Update.end(true)) Update.printError(Serial);
    (void)request;
    (void)filename;
  });
  if (LittleFS.begin(false)) {
    // Some ESPAsyncWebServer builds do not apply setDefaultFile() to the
    // bare root path. Keep both / and /index.html reliable on the device.
    server_.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
      request->send(LittleFS, "/index.html", "text/html");
    });
    server_.serveStatic("/", LittleFS, "/").setDefaultFile("index.html");
  } else {
    server_.on("/", HTTP_GET, [](AsyncWebServerRequest* request) { request->send(503, "text/plain", "LittleFS portal niet beschikbaar"); });
  }
  server_.begin();
}

void ApiServer::update() {
  if (otaRestartAt_ != 0 && static_cast<int32_t>(millis() - otaRestartAt_) >= 0) {
    otaRestartAt_ = 0;
    ESP.restart();
  }
}
