#include "layout_renderer.h"

#include <cstdlib>
#include <ctime>

namespace {
constexpr const char* WEEKDAYS[] = {"ZO", "MA", "DI", "WO", "DO", "VR", "ZA"};
constexpr const char* MONTHS[] = {"JANUARI", "FEBRUARI", "MAART", "APRIL", "MEI", "JUNI",
                                  "JULI", "AUGUSTUS", "SEPTEMBER", "OKTOBER", "NOVEMBER", "DECEMBER"};

String replaceAll(String value, const String& needle, const String& replacement) {
  int position = value.indexOf(needle);
  while (position >= 0) {
    value.replace(needle, replacement);
    position = value.indexOf(needle, position + replacement.length());
  }
  return value;
}
}

uint16_t LayoutRenderer::colorFromHex(const String& value, uint16_t fallback) const {
  if (!display_.output() || value.length() != 7 || value[0] != '#') return fallback;
  const long parsed = strtol(value.substring(1).c_str(), nullptr, 16);
  if (parsed < 0) return fallback;
  return display_.output()->color565((parsed >> 16) & 0xFF, (parsed >> 8) & 0xFF, parsed & 0xFF);
}

String LayoutRenderer::valueAt(JsonObjectConst object, const String& path) const {
  if (path.isEmpty()) return "";
  int start = 0;
  while (start < path.length()) {
    const int separator = path.indexOf('.', start);
    const String key = separator < 0 ? path.substring(start) : path.substring(start, separator);
    if (key.isEmpty() || object.isNull()) return "";
    JsonVariantConst value = object[key];
    if (separator < 0) {
      if (value.is<const char*>()) return value.as<String>();
      if (value.is<float>() || value.is<int>()) return value.as<String>();
      return "";
    }
    object = value.as<JsonObjectConst>();
    start = separator + 1;
  }
  return "";
}

String LayoutRenderer::timeText(JsonObjectConst clockConfig) const {
  struct tm local;
  if (!time_.localTime(local)) return "--:--";
  const bool use24Hour = clockConfig["use24Hour"] | true;
  const bool seconds = clockConfig["showSeconds"] | false;
  char buffer[12];
  if (use24Hour) {
    snprintf(buffer, sizeof(buffer), seconds ? "%02d:%02d:%02d" : "%02d:%02d", local.tm_hour, local.tm_min, local.tm_sec);
  } else {
    int hour = local.tm_hour % 12;
    if (hour == 0) hour = 12;
    snprintf(buffer, sizeof(buffer), seconds ? "%2d:%02d:%02d" : "%2d:%02d", hour, local.tm_min, local.tm_sec);
  }
  return buffer;
}

String LayoutRenderer::dateText() const {
  struct tm local;
  if (!time_.localTime(local)) return "--";
  char buffer[32];
  snprintf(buffer, sizeof(buffer), "%s %02d %s", WEEKDAYS[local.tm_wday], local.tm_mday, MONTHS[local.tm_mon]);
  return buffer;
}

uint16_t LayoutRenderer::statusColor() const {
  if (!wifi_.networkReady()) return display_.output()->color565(255, 60, 60);
  if (!time_.synced()) return display_.output()->color565(255, 180, 0);
  return display_.output()->color565(80, 255, 120);
}

String LayoutRenderer::replaceVariables(String text, JsonObjectConst payload, JsonObjectConst clockConfig) const {
  JsonDocument weather;
  if (weather_.hasSnapshot()) deserializeJson(weather, weather_.snapshotJson());
  const String temperature = weather["temperatureC"].is<float>() ? String(weather["temperatureC"].as<float>(), 1) : "--.-";
  const String wind = weather["windSpeedKph"].is<float>() ? String(weather["windSpeedKph"].as<float>() / 3.6f, 1) : "--.-";
  text = replaceAll(text, "{{time}}", timeText(clockConfig));
  text = replaceAll(text, "{{date}}", dateText());
  text = replaceAll(text, "{{temperature}}", temperature);
  text = replaceAll(text, "{{wind}}", wind);
  text = replaceAll(text, "{{wifi_rssi}}", String(wifi_.rssi()));
  const char* variables[] = {"title", "message", "priority", "discipline", "location", "street", "place", "description", "incidentType", "gespreksgroep", "group", "units", "vehicleNumbers", "vehicles", "rawText", "incidentId"};
  for (const char* variable : variables) {
    text = replaceAll(text, String("{{") + variable + "}}", valueAt(payload, variable));
  }
  return text;
}

String LayoutRenderer::elementValue(JsonObjectConst element, JsonObjectConst payload, JsonObjectConst clockConfig) const {
  const String type = element["type"] | "text";
  String text = element["text"] | "";
  if (type == "clock") text = "{{time}}";
  else if (type == "date") text = "{{date}}";
  else if (type == "message_title") text = text.isEmpty() ? "{{title}}" : text;
  else if (type == "message_body") text = text.isEmpty() ? "{{message}}" : text;

  JsonObjectConst source = element["dataSource"].as<JsonObjectConst>();
  if (!source.isNull()) {
    const String sourceType = source["type"] | "static";
    const String path = source["path"] | "";
    String value;
    if (sourceType == "weather") {
      JsonDocument weather;
      if (weather_.hasSnapshot()) deserializeJson(weather, weather_.snapshotJson());
      if (path == "temperatureC") value = weather["temperatureC"].is<float>() ? String(weather["temperatureC"].as<float>(), 1) : "";
      else if (path == "windSpeedMs") value = weather["windSpeedKph"].is<float>() ? String(weather["windSpeedKph"].as<float>() / 3.6f, 1) : "";
      else value = valueAt(weather.as<JsonObjectConst>(), path);
    } else if (sourceType == "system") {
      if (path == "wifiRssi") value = String(wifi_.rssi());
      else if (path == "timeSynced") value = time_.synced() ? "OK" : "NTP FOUT";
    } else if (sourceType != "static") {
      value = valueAt(payload, path);
    }
    if (!value.isEmpty()) text = replaceAll(text, String("{{") + path + "}}", value);
    if (text.isEmpty() && !value.isEmpty()) text = value;
    if (text.isEmpty()) text = source["fallback"] | "";
  }
  text = replaceVariables(text, payload, clockConfig);
  // The built-in matrix font does not contain the UTF-8 degree glyph. Render
  // legacy layouts safely as " C" instead of showing a filled replacement box.
  text.replace("\xC2\xB0", " ");
  const String prefix = element["prefix"] | "";
  const String suffix = element["suffix"] | "";
  return prefix + text + suffix;
}

void LayoutRenderer::drawText(const String& text, int16_t x, int16_t y, int16_t width, int16_t height,
                              uint8_t scale, const String& color, const String& align) {
  if (!display_.output() || text.isEmpty()) return;
  const uint16_t pixelColor = colorFromHex(color, 0xFFFF);
  const int16_t textWidth = static_cast<int16_t>(text.length() * 6 * scale);
  int16_t drawX = x;
  if (align == "center") drawX = x + max<int16_t>(0, (width - textWidth) / 2);
  else if (align == "right") drawX = x + max<int16_t>(0, width - textWidth);
  display_.output()->setTextSize(scale);
  display_.output()->setTextColor(pixelColor);
  display_.output()->setCursor(constrain(drawX, 0, 127), constrain(y, 0, 63));
  display_.output()->print(text.substring(0, max(0, min(static_cast<int>(text.length()), width / max(1, 6 * scale)))));
  (void)height;
}

void LayoutRenderer::render(JsonObjectConst layout, JsonObjectConst payload, JsonObjectConst clockConfig, uint16_t background) {
  if (!display_.output()) return;
  display_.output()->fillScreen(background);
  JsonArrayConst elements = layout["elements"].as<JsonArrayConst>();
  for (JsonObjectConst element : elements) {
    if (!(element["visible"] | true)) continue;
    const int16_t x = constrain(element["x"] | 0, 0, 127);
    const int16_t y = constrain(element["y"] | 0, 0, 63);
    const int16_t width = max(1, min(128 - x, static_cast<int>(element["width"] | 128)));
    const int16_t height = max(1, min(64 - y, static_cast<int>(element["height"] | 8)));
    const String type = element["type"] | "text";
    const String color = element["color"] | "#F4F7FF";
    if (type == "rectangle") {
      const uint16_t lineColor = colorFromHex(color, 0xFFFF);
      display_.output()->drawFastHLine(x, y, width, lineColor);
      display_.output()->drawFastHLine(x, y + height - 1, width, lineColor);
      display_.output()->drawFastVLine(x, y, height, lineColor);
      display_.output()->drawFastVLine(x + width - 1, y, height, lineColor);
    } else if (type == "filled_rectangle") {
      display_.output()->fillRect(x, y, width, height, colorFromHex(element["backgroundColor"] | color, 0xFFFF));
    } else if (type == "line") {
      display_.output()->fillRect(x, y, width, max<int16_t>(1, height), colorFromHex(color, 0xFFFF));
    } else if (type == "status_indicator") {
      display_.output()->fillRect(x, y, min<int16_t>(6, width), min<int16_t>(6, height), statusColor());
    } else {
      const uint8_t scale = constrain(element["scale"] | element["fontSize"] | 1, 1, 4);
      drawText(elementValue(element, payload, clockConfig), x, y, width, height, scale, color, element["align"] | "left");
    }
  }
  display_.drawAudioIndicator();
  display_.output()->present();
}
